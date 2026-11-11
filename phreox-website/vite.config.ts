import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const real = path.resolve(import.meta.dirname, "../phreox-frontend/src");
// Without the app checked out next to the website, a small stand-in renders the Markdown.
const app = fs.existsSync(real) ? real : path.resolve(import.meta.dirname, "src/fallback");

/**
 * The news are Phreox-Markdown, and the website renders them with the very component of the app, so both always read a text the same way.
 * That component asks for the custom emojis of a space, which a news post does not have: this gives it the plain emoji instead.
 */
function plainEmoji(): Plugin {
  return {
    name: "plain-emoji",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer?.startsWith(app) && source.endsWith("/Emoji.tsx")) return path.resolve(import.meta.dirname, "src/components/PlainEmoji.tsx");
    },
  };
}

/** Demo answers for `npm run dev` when the server on port 8080 is not running, so that the pages have something to show and the console stays quiet. */
function demo(url: string): [number, unknown] {
  const now = Date.now();
  const asset = (platform: string, file: string, size: number) => ({ platform, name: file, size, sha256: "9f2c1d7a4be03a85c6d1e2f09b7a3c48d5e6f1a2b3c4d5e6f708192a3b4c5d6e", url: `/download/${file}` });
  const release = (version: string) => ({ version, publishedAt: new Date(now - 864e5 * 3).toISOString(), assets: [asset("windows", "Phreox-Setup.exe", 92e6), asset("macos", "Phreox.dmg", 101e6), asset("linux", "Phreox.AppImage", 98e6), asset("android", "Phreox.apk", 54e6)] });

  if (url.includes("/_api/releases")) return [200, { release: release("1.2.0"), beta: release("1.3.0-beta.2"), alpha: { ...release("1.4.0-alpha.1"), assets: [] } }];
  if (url.includes("/_api/news")) return [200, [
    { id: "1", title: "Phreox 1.2: Voice, das besser klingt", body: "Neue **Sound-Einstellungen** pro Gerät und eine Diagnose, wenn es rauscht.", category: "release", pinned: true, author: "Phreox", createdAt: now - 864e5 * 2, updatedAt: now },
    { id: "2", title: "Volt für alle Spaces", body: "Spaces sammeln jetzt Volt und schalten Emojis, Uploads und Streaming frei.", category: "update", pinned: false, author: "Phreox", createdAt: now - 864e5 * 9, updatedAt: now },
  ]];

  return [401, { error: "demo" }];
}

function quiet(proxy: { on: (event: "error", handler: (error: Error, request: { url?: string }, response: { writeHead?: (status: number, headers: Record<string, string>) => void; end?: (body: string) => void }) => void) => void }) {
  proxy.on("error", (_error, request, response) => {
    const [status, body] = demo(request.url ?? "");

    response.writeHead?.(status, { "Content-Type": "application/json" });
    response.end?.(JSON.stringify(body));
  });
}

export default defineConfig({
  plugins: [plainEmoji(), react(), tailwindcss()],
  // One copy of React: the Markdown component of the app must use the React of the website, or its hooks would not work.
  resolve: { alias: { "@app": app }, dedupe: ["react", "react-dom"] },
  server: {
    fs: { allow: [path.resolve(import.meta.dirname, "..")] },
    // `npm run dev` next to `npm run serve` (port 8080): the pages call the same paths as in production.
    proxy: {
      "/_api": { target: "http://127.0.0.1:8080", configure: quiet },
      "/_auth": { target: "http://127.0.0.1:8080", configure: quiet },
      "/download": { target: "http://127.0.0.1:8080", configure: quiet },
    },
  },
});
