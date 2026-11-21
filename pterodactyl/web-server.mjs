// The web server of phreox.talk: serves the built app (./site) without any dependency. Unknown paths answer index.html, because the
// app routes in the browser. The files under /assets have a hash in their name and may be cached for good, everything else may not.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "site");
const port = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 8080);

// The app talks to the service on the same origin under /svc: the service's own cross-origin rules do not apply then, and the
// session header and the event stream pass through unchanged.
const service = new URL(process.env.PHREOX_SERVICE_URL ?? "https://service.phreox.talk");
const SVC = "/svc";
const HOP_HEADERS = new Set(["host", "connection", "keep-alive", "origin", "referer", "transfer-encoding", "proxy-connection"]);

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".wasm": "application/wasm", ".map": "application/json",
};

async function fileFor(pathname) {
  const target = path.join(root, path.normalize(decodeURIComponent(pathname)));

  if (target !== root && !target.startsWith(root + path.sep)) return null;

  const info = await stat(target).catch(() => null);

  return info?.isFile() ? { target, size: info.size } : null;
}

// ---- the services of the cluster ----------------------------------------------------------------------------------------
//
// PHREOX_SERVICE_URL is the entry point. A cluster names its services there (GET /service/roots). A request goes to the service
// this server is with; when that one cannot be reached, to the next one, so the app keeps working while a service is away. The page
// cannot do this itself: the services take no requests of another origin.

const DOWN_MILLIS = 15_000;
const ROOTS_MILLIS = 60_000;
const ROOTS_RETRY_MILLIS = 10_000;
const CONNECT_MILLIS = 4_000;
const MAX_TRIES = 3;
const entry = service.origin;
const mesh = { roots: [], current: entry, down: new Map(), askAt: 0 };

/** The address of a service in the form it is called by, or null for one this server must not go to. */
function acceptable(address) {
  try {
    const url = new URL(String(address));

    if (url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && service.protocol === "http:")) return null;

    return url.origin;
  } catch {
    return null;
  }
}

function isDown(base) {
  return (mesh.down.get(base) ?? 0) > Date.now();
}

/** The services in the order they are tried: the one in use, the others of the cluster, the entry point; those that did not answer last. */
function candidates() {
  const all = [...new Set([mesh.current, ...mesh.roots, entry])];

  return [...all.filter((base) => !isDown(base)), ...all.filter(isDown)];
}

function markDown(base) {
  mesh.down.set(base, Date.now() + DOWN_MILLIS);
  mesh.askAt = Math.min(mesh.askAt, Date.now() + ROOTS_RETRY_MILLIS);
}

/** Asks which services are up, when the last answer is old. Nothing waits for it: the next request finds the answer. */
function askEntryPoint() {
  if (Date.now() < mesh.askAt) return;

  mesh.askAt = Date.now() + ROOTS_RETRY_MILLIS;

  const base = candidates()[0];

  fetch(`${base}/api/v1/service/roots`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(CONNECT_MILLIS) })
    .then(async (answer) => {
      if (!answer.ok) return;

      const body = await answer.json();

      mesh.roots = [...new Set((Array.isArray(body.roots) ? body.roots : []).map(acceptable).filter(Boolean))].slice(0, 8);
      mesh.askAt = Date.now() + (Number(body.ttlSeconds) > 0 ? Number(body.ttlSeconds) * 1000 : ROOTS_MILLIS);
    })
    .catch(() => markDown(base));
}

/**
 * Passes a request on. The body is sent once the service is reached, so a service that cannot be reached costs nothing of the
 * request and the next one is tried with all of it.
 */
function forward(request, response, pathname, search, tried = 0, left = candidates().slice(0, MAX_TRIES)) {
  if (tried === 0) askEntryPoint();

  const base = left[tried];

  if (!base) {
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The service is not reachable");
    return;
  }

  const target = new URL(base);
  const outgoing = Object.fromEntries(Object.entries(request.headers).filter(([name]) => !HOP_HEADERS.has(name)));
  outgoing.host = target.host;
  const options = {
    method: request.method,
    path: pathname.slice(SVC.length) + search,
    headers: outgoing,
  };
  const send = target.protocol === "http:" ? httpRequest : httpsRequest;
  let reached = false;
  const upstream = send({ ...options, protocol: target.protocol, hostname: target.hostname, port: target.port || undefined }, (answer) => {
    const back = Object.fromEntries(Object.entries(answer.headers).filter(([name]) => !HOP_HEADERS.has(name)));
    response.writeHead(answer.statusCode ?? 502, back);
    answer.pipe(response);
  });
  const begin = () => {
    if (reached) return;

    reached = true;
    upstream.setTimeout(0);
    mesh.down.delete(base);
    mesh.current = base;
    request.pipe(upstream);
  };

  upstream.setTimeout(CONNECT_MILLIS, () => {
    if (!reached) upstream.destroy(new Error("The service did not take the connection in time"));
  });
  upstream.on("socket", (socket) => {
    if (socket.connecting) socket.once(target.protocol === "http:" ? "connect" : "secureConnect", begin);
    else begin();
  });
  upstream.on("error", () => {
    if (!reached) {
      // Nothing of the request was sent yet: the next service gets all of it.
      markDown(base);
      forward(request, response, pathname, search, tried + 1, left);
      return;
    }

    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The service is not reachable");
  });
  // The page went away (a closed event stream): the connection to the service goes with it.
  response.on("close", () => upstream.destroy());
}

createServer(async (request, response) => {
  const headers = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY" };

  const requested = new URL(request.url ?? "/", "http://localhost");
  if (requested.pathname === SVC || requested.pathname.startsWith(SVC + "/")) {
    forward(request, response, requested.pathname, requested.search);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" }).end();
    return;
  }

  try {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const found = await fileFor(pathname) ?? (path.extname(pathname) === "" ? await fileFor("/index.html") : null);

    if (!found) {
      response.writeHead(404, headers).end("Not found");
      return;
    }

    const hashed = pathname.startsWith("/assets/");

    response.writeHead(200, {
      ...headers,
      "Content-Type": types[path.extname(found.target)] ?? "application/octet-stream",
      "Content-Length": found.size,
      "Cache-Control": hashed ? "public, max-age=31536000, immutable" : "no-cache",
    });

    if (request.method === "HEAD") response.end();
    else createReadStream(found.target).pipe(response);
  } catch {
    response.writeHead(400, headers).end("Bad request");
  }
}).listen(port, "0.0.0.0", () => console.log(`Phreox web: listening on ${port}`));
