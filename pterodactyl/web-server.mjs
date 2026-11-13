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

function forward(request, response, pathname, search) {
  const outgoing = Object.fromEntries(Object.entries(request.headers).filter(([name]) => !HOP_HEADERS.has(name)));
  outgoing.host = service.host;
  const options = {
    method: request.method,
    path: pathname.slice(SVC.length) + search,
    headers: outgoing,
  };
  const send = service.protocol === "http:" ? httpRequest : httpsRequest;
  const upstream = send({ ...options, protocol: service.protocol, hostname: service.hostname, port: service.port || undefined }, (answer) => {
    const back = Object.fromEntries(Object.entries(answer.headers).filter(([name]) => !HOP_HEADERS.has(name)));
    response.writeHead(answer.statusCode ?? 502, back);
    answer.pipe(response);
  });
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("The service is not reachable");
  });
  request.pipe(upstream);
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
