'use client'

import { create } from 'zustand'
import type { Trade, BookSnapshot, MicroStats, LogEntry, SessionState, Symbol } from './engine/models'
import { fetchSnapshot } from '@/src/api/marketdata'
import { getReplayProgress, getSession, type ReplayProgress } from '@/src/api/sessions'

interface Settings { ladderLevels: number; updateSpeed: number; density: 'compact' | 'comfy' }

type StreamName = 'marketdata' | 'trades'
type StreamStatus = 'connected' | 'reconnecting' | 'disconnected'

interface TradingStore {
  sessionId: string | null
  sessionState: SessionState
  replaySpeed: number
  symbol: Symbol
  book: BookSnapshot
  stats: MicroStats
  trades: Trade[]
  midHistory: number[]
  logs: LogEntry[]
  focusedLadderIndex: number | null
  dockTab: 'logs' | 'replay' | 'settings'
  settings: Settings
  replayProgress: ReplayProgress | null

  streamStatus: Record<StreamName, StreamStatus>

  setSymbol: (s: Symbol) => void
  setSessionState: (s: SessionState) => void
  setReplaySpeed: (s: number) => void
  setFocusedLadderIndex: (i: number | null) => void
  setDockTab: (t: 'logs' | 'replay' | 'settings') => void
  updateSettings: (s: Partial<Settings>) => void

  connectSession: (sessionId: string) => Promise<void>

  setStreamStatus: (stream: StreamName, status: StreamStatus) => void

  updateFromMarketData: (msg: any) => void
  updateFromTrade: (msg: any) => void
  resyncSnapshot: () => Promise<void>
  fetchProgress: () => Promise<void>
}

const emptyBook: BookSnapshot = { bids: [], asks: [], mid: 0, spread: 0, lastTradePrice: 0, lastTradeSide: 'BUY' }

export const useStore = create<TradingStore>((set, get) => ({
  sessionId: null,
  sessionState: 'PAUSED',
  replaySpeed: 1,
  symbol: 'MSFT',
  book: emptyBook,
  stats: { spread: 0, mid: 0, microprice: 0, imbalance: 0, tradesPerSec: 0, volume60s: 0, bookUpdateRate: 0 },
  trades: [],
  midHistory: [],
  logs: [],
  focusedLadderIndex: null,
  dockTab: 'replay',
  settings: { ladderLevels: 25, updateSpeed: 200, density: 'compact' },
  replayProgress: null,

  streamStatus: { marketdata: 'disconnected', trades: 'disconnected' },

  setSymbol: (s) => set({ symbol: s }),
  setSessionState: (s) => set({ sessionState: s }),
  setReplaySpeed: (s) => set({ replaySpeed: s }),
  setFocusedLadderIndex: (i) => set({ focusedLadderIndex: i }),
  setDockTab: (t) => set({ dockTab: t }),
  updateSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),

  connectSession: async (sessionId: string) => {
    try {
      const session = await getSession(sessionId)
      if (session.status === 'STOPPED') {
        localStorage.removeItem('tt.session_id')
        set({ sessionId: null })
        return
      }

      set({
        sessionId,
        symbol: session.symbol as Symbol,
        replaySpeed: session.replay_speed,
        sessionState: session.status === 'RUNNING' ? 'REPLAY' : 'PAUSED',
      })
      localStorage.setItem('tt.session_id', sessionId)
      await get().resyncSnapshot()
    } catch {
      localStorage.removeItem('tt.session_id')
      set({ sessionId: null })
    }
  },

  setStreamStatus: (stream, status) =>
    set(state => {
      if (state.streamStatus[stream] === status) return state
      return { streamStatus: { ...state.streamStatus, [stream]: status } }
    }),

  updateFromMarketData: (msg) => {
    if (msg.event !== 'snapshot') return
    const bids = (msg.bids || []).map((b: any) => ({ price: Number(b.price), size: b.size, ordersCount: b.orders }))
    const asks = (msg.asks || []).map((a: any) => ({ price: Number(a.price), size: a.size, ordersCount: a.orders }))
    if (!bids.length || !asks.length) return
    const mid = (bids[0].price + asks[0].price) / 2
    const spread = asks[0].price - bids[0].price
    set(state => ({
      book: { bids, asks, mid, spread, lastTradePrice: state.book.lastTradePrice || mid, lastTradeSide: state.book.lastTradeSide },
      stats: { ...state.stats, mid, spread },
      midHistory: [...state.midHistory.slice(-199), mid],
    }))
  },

  updateFromTrade: (msg) => {
    if (msg.event !== 'trade') return
    const trade: Trade = { id: `${msg.ts}-${Math.random()}`, ts: msg.ts, price: Number(msg.price), size: msg.size, side: msg.aggressor === 'B' ? 'BUY' : 'SELL' }
    set(state => ({ trades: [trade, ...state.trades].slice(0, 500), book: { ...state.book, lastTradePrice: trade.price, lastTradeSide: trade.side } }))
  },

  resyncSnapshot: async () => {
    const sessionId = get().sessionId
    if (!sessionId) return
    try {
      const snapshot = await fetchSnapshot(sessionId)
      get().updateFromMarketData(snapshot)
    } catch {}
  },

  fetchProgress: async () => {
    const sessionId = get().sessionId
    if (!sessionId) return
    try {
      const progress = await getReplayProgress(sessionId)
      set({ replayProgress: progress })
    } catch {}
  },
}))
