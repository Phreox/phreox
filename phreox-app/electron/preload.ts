import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { PresenceConfig, PresenceStatus } from "./presence.js";

// Sandboxed preloads cannot import local modules, so the channel names are
// repeated from channels.ts here. Keep both in sync.
const CONFIGURE = "presence:configure";
const GET_STATUS = "presence:get-status";
const STATUS = "presence:status";

/** The API the renderer sees as `window.phreox`. */
const phreox = {
  presence: {
    configure: (config: PresenceConfig): Promise<unknown> =>
      ipcRenderer.invoke(CONFIGURE, config),

    status: (): Promise<PresenceStatus> => ipcRenderer.invoke(GET_STATUS),

    onStatus(listener: (status: PresenceStatus) => void): () => void {
      const handler = (_event: IpcRendererEvent, status: PresenceStatus) =>
        listener(status);

      ipcRenderer.on(STATUS, handler);

      return () => {
        ipcRenderer.off(STATUS, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld("phreox", phreox);
