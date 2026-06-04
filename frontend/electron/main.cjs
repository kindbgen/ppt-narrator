/**
 * Electron Main Process (CommonJS)
 * PPT Narrator — Desktop Application Entry Point
 */
const { app, BrowserWindow, ipcMain, session, safeStorage } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// Override app name (used for userData path) to Chinese
app.setName('PPT演讲助手')

// Settings file path
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

// Sensitive keys to encrypt
const SENSITIVE_KEYS = ['apiKey', 'claudeApiKey', 'openaiApiKey', 'ollamaEndpoint', 'mcpToken']
const CRYPT_PREFIX = '__enc__:'

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {}
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
    if (safeStorage.isEncryptionAvailable()) {
      for (const k of SENSITIVE_KEYS) {
        if (raw[k] && raw[k].startsWith(CRYPT_PREFIX)) {
          try { raw[k] = safeStorage.decryptString(Buffer.from(raw[k].slice(CRYPT_PREFIX.length), 'base64')) } catch { delete raw[k] }
        }
      }
    }
    return raw
  } catch { return {} }
}

function saveSettings(data) {
  const toSave = { ...data }
  if (safeStorage.isEncryptionAvailable()) {
    for (const k of SENSITIVE_KEYS) {
      if (toSave[k]) toSave[k] = CRYPT_PREFIX + safeStorage.encryptString(toSave[k]).toString('base64')
    }
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toSave, null, 2))
}

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const DIST = path.join(__dirname, '..', 'dist')

let mainWindow = null
let presenterWindow = null
let narratorWindow = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    title: 'PPT演讲助手',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
    },
  })
  loadWindow(mainWindow, '/#/')
  mainWindow.on('closed', () => {
    mainWindow = null
    if (presenterWindow && !presenterWindow.isDestroyed()) presenterWindow.close()
    if (narratorWindow && !narratorWindow.isDestroyed()) narratorWindow.close()
  })
}

function createPresenterWindow() {
  if (presenterWindow && !presenterWindow.isDestroyed()) { presenterWindow.focus(); return }
  presenterWindow = new BrowserWindow({
    fullscreen: true, title: 'PPT 演示屏',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
    },
  })
  loadWindow(presenterWindow, '/#/presenter')
  presenterWindow.on('closed', () => {
    presenterWindow = null
    if (narratorWindow && !narratorWindow.isDestroyed()) {
      narratorWindow.webContents.send('sync:receive', { type: 'PRESENTATION_END', data: { timestamp: Date.now() } })
    }
  })
}

function createNarratorWindow() {
  if (narratorWindow && !narratorWindow.isDestroyed()) { narratorWindow.focus(); return }
  narratorWindow = new BrowserWindow({
    width: 1200, height: 780, title: '演讲旁白屏',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
    },
  })
  loadWindow(narratorWindow, '/#/narrator')
  narratorWindow.on('closed', () => {
    narratorWindow = null
    if (presenterWindow && !presenterWindow.isDestroyed()) {
      presenterWindow.webContents.send('sync:receive', { type: 'PRESENTATION_END', data: { timestamp: Date.now() } })
    }
  })
}

function loadWindow(win, hash) {
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + hash)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(DIST, 'index.html'), { hash: hash.replace(/^\/#/, '') })
  }
}

// IPC Sync Broker
ipcMain.on('sync:broadcast', (event, { type, data }) => {
  const sender = event.sender
  const pWC = presenterWindow && !presenterWindow.isDestroyed() ? presenterWindow.webContents : null
  const nWC = narratorWindow && !narratorWindow.isDestroyed() ? narratorWindow.webContents : null

  const targets = []
  if (type === 'PRESENTATION_END') {
    if (pWC) targets.push(presenterWindow)
    if (nWC) targets.push(narratorWindow)
  } else if (sender === nWC && pWC) {
    targets.push(presenterWindow)
  } else if (sender === pWC && nWC) {
    targets.push(narratorWindow)
  }
  targets.forEach(t => t.webContents.send('sync:receive', { type, data }))
})

ipcMain.on('window:open-presenter', () => createPresenterWindow())
ipcMain.on('window:open-narrator', () => createNarratorWindow())
ipcMain.on('window:close-narrator', () => { if (narratorWindow && !narratorWindow.isDestroyed()) narratorWindow.close() })
ipcMain.on('window:close-self', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) { if (win.isFullScreen()) win.setFullScreen(false); win.close() }
})
ipcMain.on('window:toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.setFullScreen(!win.isFullScreen())
})

ipcMain.handle('settings:get', () => loadSettings())
ipcMain.handle('settings:save', (_, data) => {
  try { saveSettings(data); return { ok: true } } catch (e) { return { error: e.message } }
})

function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src *",
      "frame-src 'self'",
      "worker-src 'self' blob:",
    ].join('; ') }})
  })
}

app.whenReady().then(() => {
  setupCSP(); createMainWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 ? createMainWindow() : mainWindow?.focus())
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => {
  if (presenterWindow && !presenterWindow.isDestroyed()) presenterWindow.close()
  if (narratorWindow && !narratorWindow.isDestroyed()) narratorWindow.close()
})
