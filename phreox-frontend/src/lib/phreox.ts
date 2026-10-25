/** Types for the bridge that the Electron preload exposes as `window.phreox`.
 * In a browser the bridge is missing and the app runs without game detection. */

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

export type PhreoxBridge = {
  presence: {
    configure(config: PresenceConfig): Promise<unknown>;
    status(): Promise<PresenceStatus>;
    onStatus(listener: (status: PresenceStatus) => void): () => void;
  };
};

declare global {
  interface Window {
    phreox?: PhreoxBridge;
  }
}
