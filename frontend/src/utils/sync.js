/**
 * 双屏同步工具 - 统一入口
 *
 * Auto-detects environment at runtime:
 * - Electron: Uses IPC (main process message broker)
 * - Browser: Uses BroadcastChannel API
 */
import { useSync as useElectronSync } from './sync-electron'

// Check if running inside Electron (contextBridge exposes window.pptSync)
function isElectron() {
  return !!(window.pptSync)
}

// ============ Browser Implementation (BroadcastChannel) ============

let browserInstance = null

class BroadcastChannelSync {
  constructor() {
    this.channel = new BroadcastChannel('ppt-narrator-sync')
    this.listeners = new Map()
    this.init()
  }

  init() {
    this.channel.onmessage = (event) => {
      const { type, data } = event.data
      const callback = this.listeners.get(type)
      if (callback) {
        callback(data)
      }
    }
  }

  broadcastPageChange(pageIndex, narration) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'PAGE_CHANGE',
      data: { pageIndex, narration, timestamp: Date.now() }
    })))
  }

  broadcastPresentationStart(slides) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'PRESENTATION_START',
      data: { slides, timestamp: Date.now() }
    })))
  }

  broadcastPresentationEnd() {
    this.channel.postMessage({
      type: 'PRESENTATION_END',
      data: { timestamp: Date.now() }
    })
  }

  broadcastTimerUpdate(elapsedTime, remainingTime) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'TIMER_UPDATE',
      data: { elapsedTime, remainingTime, timestamp: Date.now() }
    })))
  }

  on(event, callback) {
    this.listeners.set(event, callback)
  }

  off(event) {
    this.listeners.delete(event)
  }

  close() {
    this.channel.close()
    this.listeners.clear()
  }
}

// ============ Public API ============

/**
 * Returns the appropriate sync implementation:
 * - Electron IPC adapter if running in Electron
 * - BroadcastChannel adapter if running in browser
 */
export function useSync() {
  if (isElectron()) {
    return useElectronSync()
  }

  // Browser fallback
  if (!browserInstance) {
    browserInstance = new BroadcastChannelSync()
  }
  return browserInstance
}
