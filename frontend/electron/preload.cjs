const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pptSync', {
  broadcast(type, data) { ipcRenderer.send('sync:broadcast', { type, data }) },
  onReceive(callback) {
    const handler = (_e, { type, data }) => callback({ type, data })
    ipcRenderer.on('sync:receive', handler)
    return () => ipcRenderer.removeListener('sync:receive', handler)
  },
})

contextBridge.exposeInMainWorld('electronAPI', {
  openPresenterWindow() { ipcRenderer.send('window:open-presenter') },
  openNarratorWindow() { ipcRenderer.send('window:open-narrator') },
  closeNarratorWindow() { ipcRenderer.send('window:close-narrator') },
  closeSelf() { ipcRenderer.send('window:close-self') },
  toggleFullscreen() { ipcRenderer.send('window:toggle-fullscreen') },
  getSettings() { return ipcRenderer.invoke('settings:get') },
})
