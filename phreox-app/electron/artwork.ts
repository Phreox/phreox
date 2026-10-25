import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

const API = "https://www.steamgriddb.com/api/v2";
const TIMEOUT_MS = 8000;

type SearchResult = { id: number; name: string };
type Icon = { url: string; width: number; height: number };

/**
 * Square game icons from SteamGridDB, looked up by game name.
 *
 * The images stay on SteamGridDB's servers. Only their URLs are stored, in
 * `game-icons.json` in the app's data folder, so each game is looked up once.
 * Without an API key nothing is fetched.
 */
export class Artwork {
  private readonly cache = new Map<string, string | null>();
  private readonly file = path.join(app.getPath("userData"), "game-icons.json");
  private readonly loaded: Promise<void>;

  constructor(private readonly apiKey: string | undefined) {
    this.loaded = this.load();
  }

  /** Square icon URL for a game, or `null` when none is known. */
  async iconFor(name: string): Promise<string | null> {
    if (!this.apiKey) return null;

    await this.loaded;

    const key = name.toLowerCase();
    const known = this.cache.get(key);

    if (known !== undefined) return known;

    try {
      const icon = await this.lookup(name);

      this.cache.set(key, icon);
      void this.save();

      return icon;
    } catch (error) {
      // Network errors are not cached, so the next scan tries again.
      console.warn("[artwork]", name, (error as Error).message);
      return null;
    }
  }

  private async lookup(name: string): Promise<string | null> {
    const results = await this.get<SearchResult[]>(
      `/search/autocomplete/${encodeURIComponent(name)}`,
    );

    const wanted = name.toLowerCase();
    const game =
      results.find((result) => result.name.toLowerCase() === wanted) ?? results[0];

    if (!game) return null;

    const icons = await this.get<Icon[]>(`/icons/game/${game.id}`);

    return icons.find((icon) => icon.width === icon.height)?.url ?? null;
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`SteamGridDB answered ${response.status}`);
    }

    const body = (await response.json()) as { success: boolean; data: T };

    if (!body.success) throw new Error("SteamGridDB reported a failure");

    return body.data;
  }

  private async load(): Promise<void> {
    try {
      const entries = JSON.parse(await fs.readFile(this.file, "utf8")) as Record<
        string,
        string | null
      >;

      for (const [key, url] of Object.entries(entries)) this.cache.set(key, url);
    } catch {
      // No cache yet.
    }
  }

  private async save(): Promise<void> {
    await fs
      .writeFile(this.file, JSON.stringify(Object.fromEntries(this.cache)), "utf8")
      .catch(() => undefined);
  }
}
