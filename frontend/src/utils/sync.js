/**
 * 双屏同步工具 - 统一使用 BroadcastChannel
 *
 * Works in both browser tabs and Electron windows,
 * since Electron BrowserWindows share the same Chromium session.
 */

let instance = null

class PPTSync {
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

export function useSync() {
  if (!instance) {
    instance = new PPTSync()
  }
  return instance
}
