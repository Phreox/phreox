import { useSyncExternalStore } from "react";

/** What the overview shows. The order is the order on the page. */
export const widgetNames = ["queue", "stats", "accounts", "spaces", "audit", "news", "system", "roles"] as const;
export type Widget = (typeof widgetNames)[number];

export type DashSettings = {
  widgets: Record<Widget, boolean>;
  density: "comfortable" | "compact";
  /** Seconds between two automatic reloads, 0 for never. */
  refresh: 0 | 15 | 30 | 60;
  ids: boolean;
  sort: "newest" | "name";
};

export const defaults: DashSettings = {
  widgets: { queue: true, stats: true, accounts: true, spaces: true, audit: true, news: true, system: true, roles: true },
  density: "comfortable",
  refresh: 0,
  ids: false,
  sort: "newest",
};

const key = "phreox.site.dash";
const listeners = new Set<() => void>();

function read(): DashSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<DashSettings>;

    return { ...defaults, ...saved, widgets: { ...defaults.widgets, ...saved.widgets } };
  } catch {
    return defaults;
  }
}

let current = read();

export function setDashSettings(next: DashSettings) {
  current = next;

  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Holds for this visit only.
  }

  listeners.forEach((listener) => listener());
}

export function useDashSettings(): DashSettings {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  }, () => current);
}
