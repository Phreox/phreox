import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 300;

/**
 * Runs the frontend's Vite dev server for the app. An already running server
 * is reused, so a second terminal with `npm run dev` keeps working.
 *
 * `PHREOX_FRONTEND_CMD` replaces the default `npm run dev`, for example with
 * `pnpm dev`.
 */
export class FrontendDevServer {
  private child: ChildProcess | undefined;

  /** Resolves to `true` once `url` answers, `false` if it does not in time. */
  async start(url: string): Promise<boolean> {
    if (await isReachable(url)) return true;

    const [command, ...args] = (process.env.PHREOX_FRONTEND_CMD ?? "npm run dev").split(" ");
    const cwd = path.join(__dirname, "..", "..", "phreox-frontend");

    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    this.child = child;

    child.stdout?.on("data", (chunk) => process.stdout.write(`[frontend] ${chunk}`));
    child.stderr?.on("data", (chunk) => process.stderr.write(`[frontend] ${chunk}`));

    child.on("exit", () => {
      if (this.child === child) this.child = undefined;
    });

    child.on("error", (error) => console.warn("[frontend]", error.message));

    const deadline = Date.now() + START_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (await isReachable(url)) return true;

      // The server exited, for example because the dependencies are missing.
      if (!this.child) return false;

      await sleep(POLL_INTERVAL_MS);
    }

    return false;
  }

  stop(): void {
    this.child?.kill();
    this.child = undefined;
  }
}

async function isReachable(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
