import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import path from "node:path";
import { Artwork } from "./artwork.js";
import { channels } from "./channels.js";
import { FrontendDevServer } from "./devServer.js";
import {
  PresenceBridge,
  type PresenceStatus,
  presenceArgs,
  presenceBinary,
} from "./presence.js";

const APP_URL = process.env.PHREOX_APP_URL ?? "http://localhost:5173";

let presence: PresenceBridge | undefined;
let artwork: Artwork | undefined;
const frontend = new FrontendDevServer();

/** Adds the square icon of the running game. Other states pass unchanged. */
async function withIcon(status: PresenceStatus): Promise<PresenceStatus> {
  if (status.state !== "playing") return status;

  const icon = (await artwork?.iconFor(status.game.name)) ?? null;

  return { ...status, game: { ...status.game, icon } };
}

app.whenReady().then(async () => {
  // No menu bar (File, Edit, View, Window).
  Menu.setApplicationMenu(null);

  artwork = new Artwork(process.env.STEAMGRIDDB_API_KEY);

  presence = new PresenceBridge(presenceBinary(), presenceArgs());
  presence.start();

  presence.onStatus(async (status) => {
    const enriched = await withIcon(status);

    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(channels.presenceStatus, enriched);
    }
  });

  ipcMain.handle(channels.presenceConfigure, (_event, config: unknown) =>
    presence?.configure(config),
  );

  ipcMain.handle(channels.presenceGetStatus, () =>
    withIcon(presence?.currentStatus() ?? { state: "disabled" }),
  );

  // In development the app starts the frontend itself. A packaged app or a
  // custom PHREOX_APP_URL is used as it is.
  if (!app.isPackaged && process.env.PHREOX_APP_URL === undefined) {
    const ready = await frontend.start(APP_URL);

    if (!ready) {
      dialog.showErrorBox(
        "Frontend nicht erreichbar",
        `Der Dev-Server unter ${APP_URL} startet nicht.\n\nStarte ihn manuell mit "npm run dev" in phreox-frontend und versuche es erneut.`,
      );
    }
  }

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  window.loadURL(APP_URL).catch((error: Error) => {
    console.warn("[app] could not load", APP_URL, error.message);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  presence?.stop();
  frontend.stop();
});
