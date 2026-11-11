// The server of phreox.com: serves the built website (./site), keeps the login in a cookie, passes the calls of the pages to
// phreox-service and hands out the downloads of the release channels. No dependencies: Node 22 is enough.
//
//   PHREOX_SITE_GATE=1 (default)  everything needs a Phreox account with the team flag, until the site is opened with PHREOX_SITE_GATE=0
//   PHREOX_SERVICE_URL            the service that knows the accounts and keeps the news
//   PHREOX_SITE_HOST              the domain (phreox.com): www. and other names are sent there
//   PHREOX_UPDATE_REPO / _TOKEN   the releases repository the downloads come from, and the token for it while it is private
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "site");
const env = process.env;
const port = Number(env.SERVER_PORT ?? env.PORT ?? 8080);
const service = (env.PHREOX_SERVICE_URL ?? "https://service.phreox.talk").replace(/\/+$/, "");
const siteHost = (env.PHREOX_SITE_HOST ?? "").trim().toLowerCase();
const gated = env.PHREOX_SITE_GATE !== "0";
const repo = env.PHREOX_UPDATE_REPO ?? "Phreox/releases";
const githubToken = env.PHREOX_UPDATE_TOKEN ?? "";
const githubApi = (env.PHREOX_UPDATE_API ?? "https://api.github.com").replace(/\/+$/, "");
const version = env.PHREOX_SITE_VERSION ?? "";

const cookieName = "phreox_site";
const maxBody = 256 * 1024;
const sessionCheckMillis = 60_000;
const releasesMillis = 60_000;
const channels = {
  release: /^\d+\.\d+\.\d+$/,
  beta: /^\d+\.\d+\.\d+-(beta|pre|rc)\.\d+$/,
  alpha: /^\d+\.\d+\.\d+-(alpha|pre\.alpha)\.\d+$/,
};
const platforms = { AppImage: "linux", exe: "windows", dmg: "macos", apk: "android" };

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".xml": "application/xml",
};

// What a visitor may fetch before they have logged in: the page of the login and its few files.
const openPaths = new Set(["/gate.js", "/gate.css", "/phreox-logo.png", "/phreox-logo.svg", "/favicon.ico", "/healthz"]);

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

// ---- helpers -------------------------------------------------------------------------------------------------------

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...securityHeaders, ...headers });
  response.end(body);
}

function json(response, status, value, headers = {}) {
  send(response, status, JSON.stringify(value), { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
}

function cookies(request) {
  return Object.fromEntries((request.headers.cookie ?? "").split(";").map((part) => part.trim().split(/=(.*)/s).slice(0, 2)).filter(([name]) => name));
}

function secure(request) {
  return request.headers["x-forwarded-proto"] === "https" || (siteHost !== "" && request.headers.host === siteHost);
}

function sessionCookie(request, token, maxAge) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(request) ? "; Secure" : ""}`;
}

async function readBody(request) {
  const parts = [];
  let size = 0;

  for await (const part of request) {
    size += part.length;

    if (size > maxBody) throw Object.assign(new Error("Body too large"), { status: 413 });

    parts.push(part);
  }

  return Buffer.concat(parts).toString("utf8");
}

/** A call to the service. Returns its status and its answer as text. */
async function callService(method, pathname, token, body) {
  const response = await fetch(`${service}/api/v1${pathname}`, {
    method,
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  return { status: response.status, text: await response.text() };
}

// ---- the session ---------------------------------------------------------------------------------------------------

const sessions = new Map();

/** What the service says about this session, asked at most once a minute per token. Null when the session is not valid. */
async function sessionOf(token) {
  if (!token) return null;

  const known = sessions.get(token);

  if (known && known.until > Date.now()) return known.me;

  try {
    const { status, text } = await callService("GET", "/admin/me", token);
    const me = status === 200 ? JSON.parse(text) : null;

    sessions.set(token, { me, until: Date.now() + sessionCheckMillis });

    if (sessions.size > 2000) for (const [key, value] of sessions) if (value.until < Date.now()) sessions.delete(key);

    return me;
  } catch {
    return known?.me ?? null;
  }
}

async function allowed(request) {
  const me = await sessionOf(cookies(request)[cookieName]);

  if (!me) return null;

  return !gated || me.flags.includes("team") ? me : null;
}

async function login(request, response) {
  let credentials;

  try {
    credentials = JSON.parse(await readBody(request));
  } catch {
    return json(response, 400, { error: "Bad request" });
  }

  const { status, text } = await callService("POST", "/auth/login", null, JSON.stringify({ username: credentials.username, password: credentials.password, code: credentials.code || undefined }));

  if (status !== 200) return send(response, status, text, { "Content-Type": "application/json", "Cache-Control": "no-store" });

  const session = JSON.parse(text);
  const me = await sessionOf(session.token);

  // The site is for the team for now: somebody else's right password opens nothing, and their session does not stay.
  if (gated && !me?.flags.includes("team")) {
    await callService("POST", "/auth/logout", session.token).catch(() => undefined);
    sessions.delete(session.token);

    return json(response, 403, { error: "team-only" });
  }

  json(response, 200, { username: session.username, flags: me?.flags ?? [] }, { "Set-Cookie": sessionCookie(request, session.token, Math.max(60, Math.floor((session.expiresAt - Date.now()) / 1000))) });
}

/** Mails the code for the second step to an account that uses codes by mail (the service checks the password first). */
async function loginCode(request, response) {
  let credentials;

  try {
    credentials = JSON.parse(await readBody(request));
  } catch {
    return json(response, 400, { error: "Bad request" });
  }

  const { status, text } = await callService("POST", "/auth/login/email-code", null, JSON.stringify({ username: credentials.username, password: credentials.password }));

  send(response, status === 204 ? 200 : status, status === 204 || !text ? "{}" : text, { "Content-Type": "application/json", "Cache-Control": "no-store" });
}

async function logout(request, response) {
  const token = cookies(request)[cookieName];

  if (token) {
    await callService("POST", "/auth/logout", token).catch(() => undefined);
    sessions.delete(token);
  }

  json(response, 200, { ok: true }, { "Set-Cookie": sessionCookie(request, "", 0) });
}

// ---- the calls of the pages ----------------------------------------------------------------------------------------

const proxied = [
  { methods: ["GET"], pattern: /^\/news(\/[A-Za-z0-9-]+)?$/, open: true },
  { methods: ["POST", "PUT", "DELETE"], pattern: /^\/news(\/[A-Za-z0-9-]+)?$/ },
  { methods: ["GET", "POST", "PUT", "DELETE"], pattern: /^\/admin\/[A-Za-z0-9/_-]*$/ },
];

async function api(request, response, url) {
  const pathname = url.pathname.slice("/_api".length);
  const rule = proxied.find((entry) => entry.methods.includes(request.method) && entry.pattern.test(pathname));

  if (pathname === "/releases" && request.method === "GET") {
    // The address of the file at GitHub stays here: the pages only get the address of the download of this server.
    const visible = Object.fromEntries(Object.entries(await releases()).map(([channel, release]) => [channel, { ...release, assets: release.assets.map(({ api: _hidden, ...asset }) => asset) }]));

    return json(response, 200, visible, { "Cache-Control": "public, max-age=60" });
  }
  if (!rule) return json(response, 404, { error: "Not found" });

  if (request.method !== "GET") {
    // A page of another site cannot send this header without our permission, and a cookie alone is not enough.
    const origin = request.headers.origin;

    if (request.headers["x-phreox-site"] !== "1" || (origin && new URL(origin).host !== request.headers.host)) return json(response, 403, { error: "Forbidden" });
  }

  const token = cookies(request)[cookieName];

  if (!rule.open && !token) return json(response, 401, { error: "Not logged in" });

  const body = request.method === "GET" || request.method === "DELETE" ? undefined : await readBody(request);
  const { status, text } = await callService(request.method, pathname + url.search, token, body);

  // The elevation of the second factor changed: ask the service again next time.
  if (pathname.startsWith("/admin/mfa")) sessions.delete(token);

  send(response, status, text, { "Content-Type": "application/json", "Cache-Control": "no-store" });
}

// ---- the downloads -------------------------------------------------------------------------------------------------

let cached = { until: 0, value: null, etag: null };

function githubHeaders(accept = "application/vnd.github+json") {
  return { Accept: accept, ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}), "User-Agent": "phreox-website" };
}

/** The newest release of each public channel (not dev) with its files, and the checksum of each file. */
async function releases() {
  if (cached.value && cached.until > Date.now()) return cached.value;

  try {
    const response = await fetch(`${githubApi}/repos/${repo}/releases?per_page=60`, { headers: { ...githubHeaders(), ...(cached.etag ? { "If-None-Match": cached.etag } : {}) }, signal: AbortSignal.timeout(15_000) });

    if (response.status === 304 && cached.value) {
      cached.until = Date.now() + releasesMillis;

      return cached.value;
    }

    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

    const list = await response.json();
    const value = {};

    for (const [channel, pattern] of Object.entries(channels)) {
      const release = list.find((entry) => !entry.draft && pattern.test(entry.tag_name));

      if (!release) continue;

      const sums = await checksums(release);

      value[channel] = {
        version: release.tag_name,
        publishedAt: release.published_at,
        assets: release.assets
          .filter((asset) => platforms[asset.name.split(".").pop()] && asset.name.startsWith("phreox-"))
          .map((asset) => ({ platform: platforms[asset.name.split(".").pop()], name: asset.name, size: asset.size, sha256: sums.get(asset.name) ?? null, url: `/download/${channel}/${encodeURIComponent(asset.name)}`, api: asset.url })),
      };
    }

    cached = { until: Date.now() + releasesMillis, value, etag: response.headers.get("etag") };

    return value;
  } catch (error) {
    console.error("Releases:", error.message);

    return cached.value ?? {};
  }
}

async function checksums(release) {
  const file = release.assets.find((asset) => asset.name === "SHA256SUMS");
  const result = new Map();

  if (!file) return result;

  try {
    const response = await fetch(file.url, { headers: githubHeaders("application/octet-stream"), signal: AbortSignal.timeout(15_000) });

    for (const line of (await response.text()).split("\n")) {
      const [hash, name] = line.trim().split(/\s+\*?/);

      if (hash && name) result.set(name, hash);
    }
  } catch {
    // Without checksums the downloads still work.
  }

  return result;
}

async function download(request, response, url) {
  const [, , channel, encoded] = url.pathname.split("/");
  const name = decodeURIComponent(encoded ?? "");
  const asset = (await releases())[channel]?.assets.find((entry) => entry.name === name);

  if (!asset) return send(response, 404, "Not found", { "Content-Type": "text/plain" });

  const upstream = await fetch(asset.api, { headers: githubHeaders("application/octet-stream"), redirect: "follow" });

  if (!upstream.ok || !upstream.body) return send(response, 502, "The file is not available", { "Content-Type": "text/plain" });

  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
    "Cache-Control": "no-store",
    ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length") } : {}),
  });

  if (request.method === "HEAD") return response.end();

  Readable.fromWeb(upstream.body).on("error", () => response.destroy()).pipe(response);
}

// ---- the files -----------------------------------------------------------------------------------------------------

async function fileFor(pathname) {
  const target = path.join(root, path.normalize(decodeURIComponent(pathname)));

  if (target !== root && !target.startsWith(root + path.sep)) return null;

  const info = await stat(target).catch(() => null);

  return info?.isFile() ? { target, size: info.size } : null;
}

async function serveFile(request, response, pathname, extra = {}) {
  const found = await fileFor(pathname);

  if (!found) return false;

  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": types[path.extname(found.target)] ?? "application/octet-stream",
    "Content-Length": found.size,
    "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    ...extra,
  });

  if (request.method === "HEAD") response.end();
  else createReadStream(found.target).pipe(response);

  return true;
}

function robots() {
  return gated ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /_api/\n${siteHost ? `Sitemap: https://${siteHost}/sitemap.xml\n` : ""}`;
}

function sitemap() {
  const pages = ["/", "/features", "/ember", "/volt", "/glimmer", "/download", "/news", "/support", "/safety", "/about"];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>https://${siteHost}${page}</loc></url>`).join("\n")}\n</urlset>\n`;
}

// ---- the server ----------------------------------------------------------------------------------------------------

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const host = (request.headers.host ?? "").split(":")[0].toLowerCase();

    if (url.pathname === "/healthz") return send(response, 200, "ok", { "Content-Type": "text/plain" });

    // One domain: phreox.com. www. and any other name go there (not localhost, so the site can be tried next to the server).
    if (siteHost && host !== siteHost && host !== "localhost" && host !== "127.0.0.1" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return send(response, 308, "", { Location: `https://${siteHost}${url.pathname}${url.search}` });
    }

    if (url.pathname === "/_auth/login" && request.method === "POST") return await login(request, response);
    if (url.pathname === "/_auth/login/email-code" && request.method === "POST") return await loginCode(request, response);
    if (url.pathname === "/_auth/logout" && request.method === "POST") return await logout(request, response);
    if (url.pathname === "/robots.txt") return send(response, 200, robots(), { "Content-Type": "text/plain; charset=utf-8" });

    const me = await allowed(request);

    if (url.pathname === "/_auth/me") return me ? json(response, 200, me) : json(response, 401, { error: "Not logged in" });

    if (!me && gated && !openPaths.has(url.pathname)) {
      // The login page for people, a plain refusal for everything else.
      if (request.method === "GET" && path.extname(url.pathname) === "" && !url.pathname.startsWith("/_") && !url.pathname.startsWith("/download")) {
        if (await serveFile(request, response, "/gate.html", { "Cache-Control": "no-store" })) return;
      }

      return json(response, 401, { error: "Not logged in" });
    }

    if (request.method !== "GET" && request.method !== "HEAD" && !url.pathname.startsWith("/_api/")) return send(response, 405, "", { Allow: "GET, HEAD" });
    if (url.pathname.startsWith("/_api/")) return await api(request, response, url);
    if (url.pathname.startsWith("/download/")) return await download(request, response, url);
    if (url.pathname === "/sitemap.xml" && siteHost && !gated) return send(response, 200, sitemap(), { "Content-Type": "application/xml" });
    if (url.pathname === "/version.json") return json(response, 200, { version });
    if (await serveFile(request, response, url.pathname)) return;

    // The pages route in the browser: any path without an extension is the app.
    if (path.extname(url.pathname) === "" && await serveFile(request, response, "/index.html")) return;

    send(response, 404, "Not found", { "Content-Type": "text/plain" });
  } catch (error) {
    console.error(error);
    json(response, error.status ?? 500, { error: error.status === 413 ? "Too large" : "Something went wrong" });
  }
}).listen(port, "0.0.0.0", () => console.log(`Phreox website: listening on ${port}${gated ? " (team only)" : ""}`));
