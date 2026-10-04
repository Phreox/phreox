import { app, BrowserWindow } from "electron";

const APP_URL = process.env.PHREOX_APP_URL ?? "http://localhost:5173";

app.whenReady().then(() => {
  const window = new BrowserWindow({ width: 1200, height: 800 });
  window.loadURL(APP_URL);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
