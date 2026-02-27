'use client'

import { useEffect } from 'react'
import { fetchSnapshot } from './marketdata'
import { wsUrl } from './client'
import type { MarketDataSnapshot, TradeEvent } from './contracts'

type Status = 'connected' | 'reconnecting' | 'disconnected'

export class WSManager<T extends { event?: string }> {
  private ws: WebSocket | null = null
  private closed = false
  private retryMs = 1000
  private pingTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private path: string,
    private onMessage: (msg: T) => void,
    private onStatus: (status: Status) => void,
  ) {}

  start() {
    this.closed = false
    this.connect()
  }

  stop() {
    this.closed = true
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.ws?.close()
    this.ws = null
    this.onStatus('disconnected')
  }

  private connect() {
    this.onStatus('reconnecting')
    this.ws = new WebSocket(wsUrl(this.path))
    this.ws.onopen = () => {
      this.retryMs = 1000
      this.onStatus('connected')
      this.pingTimer = setInterval(() => this.ws?.send(JSON.stringify({ event: 'ping', ts: Date.now() })), 15000)
    }
    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed && typeof parsed === 'object' && typeof parsed.event === 'string') {
          this.onMessage(parsed as T)
        }
      } catch {}
    }
    this.ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer)
      this.onStatus('reconnecting')
      if (!this.closed) {
        setTimeout(() => this.connect(), this.retryMs)
        this.retryMs = Math.min(this.retryMs * 2, 30000)
      }
    }
  }
}

export function useMarketDataStream(sessionId: string | null, onMessage: (msg: MarketDataSnapshot | any) => void, onStatus: (s: Status) => void, onResync: () => void) {
  useEffect(() => {
    if (!sessionId) return
    const manager = new WSManager(`/ws/sessions/${sessionId}/marketdata`, async (msg) => {
      if (msg.event === 'resync_required') {
        const snapshot = await fetchSnapshot(sessionId)
        onMessage(snapshot)
        onResync()
        return
      }
      onMessage(msg)
    }, onStatus)
    manager.start()
    return () => manager.stop()
  }, [sessionId, onMessage, onStatus, onResync])
}

export function useTradesStream(sessionId: string | null, onMessage: (msg: TradeEvent) => void, onStatus: (s: Status) => void) {
  useEffect(() => {
    if (!sessionId) return
    const manager = new WSManager<TradeEvent>(`/ws/sessions/${sessionId}/trades`, onMessage, onStatus)
    manager.start()
    return () => manager.stop()
  }, [sessionId, onMessage, onStatus])
}
