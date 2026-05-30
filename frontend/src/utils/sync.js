/**
 * 双屏同步工具 - 使用 BroadcastChannel API
 */
export class PPTSync {
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

  /**
   * 广播页面切换事件
   */
  broadcastPageChange(pageIndex, narration) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'PAGE_CHANGE',
      data: { pageIndex, narration, timestamp: Date.now() }
    })))
  }

  /**
   * 广播演示开始事件
   */
  broadcastPresentationStart(slides) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'PRESENTATION_START',
      data: { slides, timestamp: Date.now() }
    })))
  }

  /**
   * 广播演示结束事件
   */
  broadcastPresentationEnd() {
    this.channel.postMessage({
      type: 'PRESENTATION_END',
      data: { timestamp: Date.now() }
    })
  }

  /**
   * 广播计时更新事件
   */
  broadcastTimerUpdate(elapsedTime, remainingTime) {
    this.channel.postMessage(JSON.parse(JSON.stringify({
      type: 'TIMER_UPDATE',
      data: { elapsedTime, remainingTime, timestamp: Date.now() }
    })))
  }

  /**
   * 订阅事件
   */
  on(event, callback) {
    this.listeners.set(event, callback)
  }

  /**
   * 取消订阅
   */
  off(event) {
    this.listeners.delete(event)
  }

  /**
   * 关闭连接
   */
  close() {
    this.channel.close()
    this.listeners.clear()
  }
}

// 单例实例
let syncInstance = null

export function useSync() {
  if (!syncInstance) {
    syncInstance = new PPTSync()
  }
  return syncInstance
}