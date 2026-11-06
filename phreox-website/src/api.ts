import { createContext, useContext, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** A call to the server of the website, which passes it on to the service with the session of the cookie. */
export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/_api${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), "X-Phreox-Site": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  if (!response.ok) {
    let message = text;

    try {
      message = JSON.parse(text).error ?? text;
    } catch {
      // Not JSON.
    }

    if (message === "mfa-required") window.dispatchEvent(new Event("phreox:relock"));

    throw new ApiError(response.status, message);
  }

  return text ? JSON.parse(text) as T : undefined as T;
}

export type Me = { id: string; username: string; flags: string[]; roles: string[]; mfaEnabled: boolean; elevated: boolean; elevatedUntil: number };

export type NewsPost = { id: string; title: string; body: string; category: string; pinned: boolean; author: string; createdAt: number; updatedAt: number };

export type Asset = { platform: "windows" | "macos" | "linux" | "android"; name: string; size: number; sha256: string | null; url: string };

export type Channel = { version: string; publishedAt: string; assets: Asset[] };

type Session = { me: Me | null; reload: () => Promise<void> };

export const SessionContext = createContext<Session>({ me: null, reload: async () => undefined });

export function useSession() {
  return useContext(SessionContext);
}

/** The signed-in account of this browser, or null. */
export function useSessionState(): Session & { ready: boolean } {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  async function reload() {
    try {
      const response = await fetch("/_auth/me");

      setMe(response.ok ? await response.json() as Me : null);
    } catch {
      setMe(null);
    }

    setReady(true);
  }

  useEffect(() => void reload(), []);

  return { me, reload, ready };
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []): { value: T | undefined; error: string | undefined; reload: () => void } {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;

    load().then((found) => live && (setValue(found), setError(undefined))).catch((failure: Error) => live && setError(failure.message));

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { value, error, reload: () => setTick((count) => count + 1) };
}
