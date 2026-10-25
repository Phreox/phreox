import { app } from "electron";
import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

export type PresenceStatus =
  | { state: "disabled" }
  | { state: "idle" }
  | {
    state: "playing";
    game: { key: string; name: string; image: string | null; icon?: string | null };
    started_at: number;
  };

export type PresenceConfig = {
  intervalSecs?: number;
  enabled?: boolean;
  detectProcesses?: boolean;
  detectSteam?: boolean;
};

type Reply = { id: number; result?: unknown; error?: string };
type Event =
  | { event: "status"; data: PresenceStatus }
  | { event: "error"; data: string };
type Message = Reply | Event;

/**
 * Keeps only known fields with the right types. The renderer is not trusted,
 * so nothing else reaches the detector process.
 */
export function sanitizeConfig(input: unknown): PresenceConfig {
  if (typeof input !== "object" || input === null) return {};

  const { intervalSecs, enabled, detectProcesses, detectSteam } =
    input as Record<string, unknown>;

  const config: PresenceConfig = {};

  if (typeof intervalSecs === "number" && Number.isFinite(intervalSecs)) {
    config.intervalSecs = intervalSecs;
  }

  if (typeof enabled === "boolean") config.enabled = enabled;
  if (typeof detectProcesses === "boolean") config.detectProcesses = detectProcesses;
  if (typeof detectSteam === "boolean") config.detectSteam = detectSteam;

  return config;
}

/** Folder with the app's bundled resources. Development uses `resources/`
 * next to the app, a packaged app uses Electron's resources folder. */
function resourcesDir(): string {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, "..", "resources");
}

/**
 * Path of the `phreox-presence` binary. It is copied to `resources/bin` by
 * `scripts/bundle-presence.mjs`, which `npm start` runs first.
 * `PHREOX_PRESENCE_BIN` overrides it.
 */
export function presenceBinary(): string {
  if (process.env.PHREOX_PRESENCE_BIN) return process.env.PHREOX_PRESENCE_BIN;

  const name = process.platform === "win32" ? "phreox-presence.exe" : "phreox-presence";

  return path.join(resourcesDir(), "bin", name);
}

/** `resources/games.json` if it exists, so a bundled game list is used by default. */
function defaultCatalog(): string | undefined {
  const file = path.join(resourcesDir(), "games.json");

  return existsSync(file) ? file : undefined;
}

/** Extra arguments for the game lists. `PHREOX_PRESENCE_CATALOG` and
 * `PHREOX_PRESENCE_OVERRIDES` replace the bundled defaults. */
export function presenceArgs(): string[] {
  const args: string[] = [];

  const catalog = process.env.PHREOX_PRESENCE_CATALOG ?? defaultCatalog();
  const overrides = process.env.PHREOX_PRESENCE_OVERRIDES;

  if (catalog) args.push("--catalog", catalog);
  if (overrides) args.push("--overrides", overrides);

  return args;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

/**
 * Runs `phreox-presence --rpc` and talks to it over stdin and stdout.
 *
 * Requests get a reply with the same id. Status changes arrive as events and
 * are forwarded to the windows by `main.ts`.
 */
export class PresenceBridge {
  private child: ChildProcess | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly events = new EventEmitter();
  private status: PresenceStatus = { state: "idle" };

  constructor(
    private readonly binary: string,
    private readonly args: string[],
  ) {}

  start(): void {
    if (this.child) return;

    const child = spawn(this.binary, ["--rpc", ...this.args], {
      stdio: ["pipe", "pipe", "inherit"],
      windowsHide: true,
    });

    this.child = child;

    if (!child.stdout) throw new Error("presence process has no stdout");

    createInterface({ input: child.stdout }).on("line", (line) => this.handleLine(line));

    // A missing binary shows up as "error". Phreox keeps running without it.
    child.on("error", (error) => this.fail(error));
    child.on("exit", (code) =>
      this.fail(new Error(`presence process exited with code ${code}`)),
    );
  }

  configure(config: unknown): Promise<unknown> {
    return this.request("configure", sanitizeConfig(config));
  }

  currentStatus(): PresenceStatus {
    return this.status;
  }

  onStatus(listener: (status: PresenceStatus) => void): () => void {
    this.events.on("status", listener);

    return () => {
      this.events.off("status", listener);
    };
  }

  stop(): void {
    const child = this.child;

    if (!child) return;

    void this.request("shutdown").catch(() => undefined);

    // Give the process a moment to exit before forcing it.
    setTimeout(() => child.kill(), 1000).unref();
  }

  private request(method: string, params: unknown = {}): Promise<unknown> {
    const stdin = this.child?.stdin;

    if (!stdin) {
      return Promise.reject(new Error("presence process is not running"));
    }

    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  private handleLine(line: string): void {
    let message: Message;

    try {
      message = JSON.parse(line) as Message;
    } catch {
      console.warn("[presence] invalid line:", line);
      return;
    }

    if ("event" in message) {
      if (message.event === "status") {
        this.status = message.data;
        this.events.emit("status", message.data);
      } else {
        console.warn("[presence]", message.data);
      }

      return;
    }

    const pending = this.pending.get(message.id);

    if (!pending) return;

    this.pending.delete(message.id);

    if (message.error !== undefined) {
      pending.reject(new Error(message.error));
    } else {
      pending.resolve(message.result);
    }
  }

  private fail(error: Error): void {
    this.child = undefined;
    this.status = { state: "disabled" };

    for (const { reject } of this.pending.values()) reject(error);
    this.pending.clear();

    this.events.emit("status", this.status);
    console.warn("[presence]", error.message);
  }
}
