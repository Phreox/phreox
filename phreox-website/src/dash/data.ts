import { useCallback, useEffect, useState } from "react";
import { call } from "../api.ts";

/**
 * What the dashboard has read, by address. Several parts of a page ask for the same list (the accounts, the system); they share one
 * request, and a page that is opened again shows what it had at once and reads anew behind it.
 */
const known = new Map<string, { value: unknown; at: number }>();
const running = new Map<string, Promise<unknown>>();
const watchers = new Map<string, Set<() => void>>();

/** What was read less than this long ago is not asked for again by a part that only appears. */
const FRESH_MILLIS = 2_000;

function fetchInto(path: string): Promise<unknown> {
  const pending = running.get(path);

  if (pending) return pending;

  const request = call<unknown>("GET", path)
    .then((value) => {
      known.set(path, { value, at: Date.now() });
      watchers.get(path)?.forEach((watcher) => watcher());

      return value;
    })
    .finally(() => running.delete(path));

  running.set(path, request);

  return request;
}

/** Reads the addresses that start with `prefix` anew, for every part that shows them (after a change). */
export function refreshData(prefix: string) {
  for (const path of watchers.keys()) {
    if (path.startsWith(prefix) && (watchers.get(path)?.size ?? 0) > 0) void fetchInto(path).catch(() => undefined);
  }

  for (const path of known.keys()) {
    if (path.startsWith(prefix) && (watchers.get(path)?.size ?? 0) === 0) known.delete(path);
  }
}

/**
 * A list or a document of the service. `tick` reads it anew when it changes (the automatic reload); `null` as the address reads nothing.
 * `loading` is true only while there is nothing to show yet.
 */
export function useData<T>(path: string | null, tick = 0): { value: T | undefined; error: string | undefined; loading: boolean; reload: () => void } {
  const [, redraw] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!path) return;

    const watcher = () => redraw((count) => count + 1);
    const set = watchers.get(path) ?? new Set();

    set.add(watcher);
    watchers.set(path, set);

    const had = known.get(path);

    if (!had || Date.now() - had.at > FRESH_MILLIS) {
      fetchInto(path).then(() => setError(undefined)).catch((failure: Error) => setError(failure.message));
    }

    return () => {
      set.delete(watcher);
    };
  }, [path, tick]);

  const reload = useCallback(() => {
    if (path) fetchInto(path).then(() => setError(undefined)).catch((failure: Error) => setError(failure.message));
  }, [path]);

  const value = path ? known.get(path)?.value as T | undefined : undefined;

  return { value, error, loading: Boolean(path) && value === undefined && !error, reload };
}
