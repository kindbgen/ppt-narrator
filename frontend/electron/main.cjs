/**
 * Electron Main Process (CommonJS)
 * PPT Narrator — Desktop Application Entry Point
 */
const { app, BrowserWindow, ipcMain, session } = require('electron')
const path = require('node:path')

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const DIST = path.join(__dirname, '..', 'dist')

let mainWindow = null
let presenterWindow = null
let narratorWindow = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 960, minHeight: 640,
    title: 'PPT 演讲助手',
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

ipcMain.handle('settings:get', () => ({
  aiProvider: process.env.VITE_AI_PROVIDER || '',
  gatewayBaseUrl: process.env.VITE_AI_GATEWAY_BASE_URL || '',
  gatewayApiKey: process.env.VITE_AI_GATEWAY_API_KEY || '',
  gatewayModel: process.env.VITE_AI_GATEWAY_MODEL || '',
  claudeApiKey: process.env.VITE_CLAUDE_API_KEY || '',
  claudeModel: process.env.VITE_CLAUDE_API_MODEL || '',
  openaiApiKey: process.env.VITE_OPENAI_API_KEY || '',
  openaiModel: process.env.VITE_OPENAI_API_MODEL || '',
  ollamaEndpoint: process.env.VITE_OLLAMA_ENDPOINT || '',
  ollamaModel: process.env.VITE_OLLAMA_MODEL || '',
  mcpUrl: process.env.VITE_DOCMOST_MCP_URL || '',
  mcpToken: process.env.VITE_DOCMOST_TOKEN || '',
}))

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
