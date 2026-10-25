import { useEffect, useState } from "react";

/** The current time in milliseconds, refreshed every `intervalMs`.
 * Pass `null` to stop refreshing and keep the last value. */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs === null) return;

    setNow(Date.now());

    const id = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
