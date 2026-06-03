/**
 * Electron IPC Sync Adapter
 *
 * Implements the same PPTSync interface as sync.js
 * but uses Electron IPC (via contextBridge) instead of BroadcastChannel.
 */

let syncInstance = null

export class PPTSync {
  constructor() {
    this.listeners = new Map()
    this.cleanup = null

    if (window.pptSync) {
      this.cleanup = window.pptSync.onReceive(({ type, data }) => {
        const callback = this.listeners.get(type)
        if (callback) {
          callback(data)
        }
      })
    }
  }

  broadcastPageChange(pageIndex, narration) {
    window.pptSync?.broadcast('PAGE_CHANGE', {
      pageIndex,
      narration,
      timestamp: Date.now(),
    })
  }

  broadcastPresentationStart(slides) {
    window.pptSync?.broadcast('PRESENTATION_START', {
      slides,
      timestamp: Date.now(),
    })
  }

  broadcastPresentationEnd() {
    window.pptSync?.broadcast('PRESENTATION_END', {
      timestamp: Date.now(),
    })
  }

  broadcastTimerUpdate(elapsedTime, remainingTime) {
    window.pptSync?.broadcast('TIMER_UPDATE', {
      elapsedTime,
      remainingTime,
      timestamp: Date.now(),
    })
  }

  on(event, callback) {
    this.listeners.set(event, callback)
  }

  off(event) {
    this.listeners.delete(event)
  }

  close() {
    if (this.cleanup) {
      this.cleanup()
      this.cleanup = null
    }
    this.listeners.clear()
  }
}

export function useSync() {
  if (!syncInstance) {
    syncInstance = new PPTSync()
  }
  return syncInstance
}

export function isElectron() {
  return !!(window.pptSync)
}
