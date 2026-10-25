import { useEffect, useState } from "react";
import type { PresenceStatus } from "./phreox.ts";

/** The current game status from the detector. `undefined` until the first
 * answer, and always `undefined` in a browser without the desktop app. */
export function usePresence(): PresenceStatus | undefined {
  const [status, setStatus] = useState<PresenceStatus>();

  useEffect(() => {
    const bridge = window.phreox;

    if (!bridge) return;

    let active = true;

    bridge.presence
      .status()
      .then((current) => {
        if (active) setStatus(current);
      })
      .catch(() => undefined);

    const unsubscribe = bridge.presence.onStatus(setStatus);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return status;
}
