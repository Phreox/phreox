import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const app = path.resolve(import.meta.dirname, "../phreox-frontend/src");

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

export default defineConfig({
  plugins: [plainEmoji(), react(), tailwindcss()],
  // One copy of React: the Markdown component of the app must use the React of the website, or its hooks would not work.
  resolve: { alias: { "@app": app }, dedupe: ["react", "react-dom"] },
  server: {
    fs: { allow: [path.resolve(import.meta.dirname, "..")] },
    // `npm run dev` next to `npm run serve` (port 8080): the pages call the same paths as in production.
    proxy: { "/_api": "http://127.0.0.1:8080", "/_auth": "http://127.0.0.1:8080", "/download": "http://127.0.0.1:8080" },
  },
});
