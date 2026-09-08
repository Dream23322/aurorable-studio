import { app, shell, BrowserWindow, ipcMain } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { startProxy, PROXY_PORT } from "./proxy"

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    title: "Aurorable",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${PROXY_PORT}/`) && !url.startsWith(process.env["ELECTRON_RENDERER_URL"] ?? "http://x")) {
      e.preventDefault()
      if (url.startsWith("http://") || url.startsWith("https://")) shell.openExternal(url)
    }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    // prod: the proxy serves out/renderer on the same origin as the API
    mainWindow.loadURL(`http://127.0.0.1:${PROXY_PORT}/`)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("dev.aurorable.studio")

  startProxy()

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

ipcMain.on("window-control", (event, action: "minimize" | "maximize" | "close") => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  switch (action) {
    case "minimize":
      win.minimize()
      break
    case "maximize":
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
      break
    case "close":
      win.close()
      break
  }
})