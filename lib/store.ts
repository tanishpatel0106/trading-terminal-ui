'use client'

import { create } from 'zustand'
import type { Side, OrderType, TIF, Order, Fill, Trade, BookSnapshot, MicroStats, LogEntry, Position, SessionState, Symbol } from './engine/models'
import { cancelOrder, listOrders, placeOrder } from '@/src/api/orders'
import { fetchSnapshot } from '@/src/api/marketdata'
import { fetchRecentTrades } from '@/src/api/trades'

interface Settings { ladderLevels: number; updateSpeed: number; density: 'compact' | 'comfy' }

// ✅ NEW: strong types for stream status
type StreamName = 'marketdata' | 'trades' | 'orders'
type StreamStatus = 'connected' | 'reconnecting' | 'disconnected'

interface TradingStore {
  sessionId: string | null
  userId: string
  sessionState: SessionState
  replaySpeed: number
  userRole: 'TRADER' | 'ADMIN'
  latency: number
  symbol: Symbol
  book: BookSnapshot
  stats: MicroStats
  trades: Trade[]
  midHistory: number[]
  orders: Order[]
  fills: Fill[]
  logs: LogEntry[]
  position: Position
  selectedSide: Side
  selectedType: OrderType
  selectedTif: TIF
  selectedQty: number
  selectedPrice: number
  focusedLadderIndex: number | null
  dockTab: 'logs' | 'risk' | 'replay' | 'settings'
  settings: Settings

  // ✅ CHANGED: typed object instead of string soup
  streamStatus: Record<StreamName, StreamStatus>

  setSymbol: (s: Symbol) => void
  setSessionState: (s: SessionState) => void
  setReplaySpeed: (s: number) => void
  setUserRole: (r: 'TRADER' | 'ADMIN') => void
  setSelectedSide: (s: Side) => void
  setSelectedType: (t: OrderType) => void
  setSelectedTif: (t: TIF) => void
  setSelectedQty: (q: number) => void
  setSelectedPrice: (p: number) => void
  setFocusedLadderIndex: (i: number | null) => void
  setDockTab: (t: 'logs' | 'risk' | 'replay' | 'settings') => void
  updateSettings: (s: Partial<Settings>) => void

  connectSession: (sessionId: string) => Promise<void>
  setUserId: (userId: string) => void

  // ✅ CHANGED: typed + idempotent updates
  setStreamStatus: (stream: StreamName, status: StreamStatus) => void

  updateFromMarketData: (msg: any) => void
  updateFromTrade: (msg: any) => void
  updateFromOrderUpdate: (msg: any) => void
  resyncSnapshot: () => Promise<void>

  placeOrder: (side: Side, type: OrderType, price: number, qty: number, tif: TIF) => Promise<void>
  cancelOrderById: (id: string) => Promise<void>
  cancelAll: () => Promise<void>
  modifyOrder: (id: string, updates: { price?: number; qty?: number }) => void
  startEngine: () => void
  stopEngine: () => void
  tickEngine: () => void
}

const emptyBook: BookSnapshot = { bids: [], asks: [], mid: 0, spread: 0, lastTradePrice: 0, lastTradeSide: 'BUY' }

export const useStore = create<TradingStore>((set, get) => ({
  sessionId: null,
  userId: 'trader1',
  sessionState: 'PAUSED',
  replaySpeed: 1,
  userRole: 'TRADER',
  latency: 0,
  symbol: 'AAPL',
  book: emptyBook,
  stats: { spread: 0, mid: 0, microprice: 0, imbalance: 0, tradesPerSec: 0, volume60s: 0, bookUpdateRate: 0 },
  trades: [],
  midHistory: [],
  orders: [],
  fills: [],
  logs: [],
  position: { symbol: 'AAPL', qty: 0, avgPx: 0, realizedPnl: 0, unrealizedPnl: 0 },
  selectedSide: 'BUY', selectedType: 'LMT', selectedTif: 'DAY', selectedQty: 100, selectedPrice: 0,
  focusedLadderIndex: null, dockTab: 'logs', settings: { ladderLevels: 25, updateSpeed: 200, density: 'compact' },

  // ✅ CHANGED: typed defaults
  streamStatus: { marketdata: 'disconnected', trades: 'disconnected', orders: 'disconnected' },

  setSymbol: (s) => set({ symbol: s }),
  setSessionState: (s) => set({ sessionState: s }),
  setReplaySpeed: (s) => set({ replaySpeed: s }),
  setUserRole: (r) => set({ userRole: r }),
  setSelectedSide: (s) => set({ selectedSide: s }),
  setSelectedType: (t) => set({ selectedType: t }),
  setSelectedTif: (t) => set({ selectedTif: t }),
  setSelectedQty: (q) => set({ selectedQty: q }),
  setSelectedPrice: (p) => set({ selectedPrice: p }),
  setFocusedLadderIndex: (i) => set({ focusedLadderIndex: i }),
  setDockTab: (t) => set({ dockTab: t }),
  updateSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),

  connectSession: async (sessionId: string) => {
    set({ sessionId })
    localStorage.setItem('tt.session_id', sessionId)
    await get().resyncSnapshot()
    const trades = await fetchRecentTrades(sessionId)
    set({
      trades: trades.map((t: any) => ({ id: t.id, ts: Date.parse(t.ts), price: Number(t.price), size: t.qty, side: t.side === 'B' ? 'BUY' : 'SELL' })),
    })
    const orders = await listOrders(sessionId, get().userId)
    set({
      orders: orders.map((o: any) => ({
        id: o.id,
        ts: Date.parse(o.created_at),
        side: o.side === 'B' ? 'BUY' : 'SELL',
        type: o.type === 'LIMIT' ? 'LMT' : 'MKT',
        price: Number(o.price || 0),
        qty: o.qty,
        filledQty: o.qty - o.leaves_qty,
        leaves: o.leaves_qty,
        status: o.status === 'CANCELED' ? 'CXL' : o.status === 'REJECTED' ? 'REJ' : o.status,
        tif: o.tif || 'DAY',
        symbol: get().symbol
      })),
    })
  },

  setUserId: (userId: string) => {
    set({ userId })
    localStorage.setItem('tt.user_id', userId)
  },

  // ✅ FIX: do nothing if status already the same (prevents infinite loops)
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

  updateFromOrderUpdate: (msg) => {
    if (msg.event !== 'order') return
    const mappedStatus = msg.status === 'CANCELED' ? 'CXL' : msg.status === 'REJECTED' ? 'REJ' : msg.status
    set(state => {
      const idx = state.orders.findIndex(o => o.id === msg.order_id)
      if (idx >= 0) {
        const next = [...state.orders]
        next[idx] = {
          ...next[idx],
          status: mappedStatus,
          leaves: msg.leaves_qty ?? next[idx].leaves,
          filledQty: (next[idx].qty - (msg.leaves_qty ?? next[idx].leaves)),
        }
        return { orders: next }
      }
      return {
        orders: [{
          id: msg.order_id,
          ts: msg.ts,
          side: msg.side === 'S' ? 'SELL' : 'BUY',
          type: 'LMT',
          price: Number(msg.price || 0),
          qty: msg.qty || 0,
          leaves: msg.leaves_qty ?? msg.qty ?? 0,
          filledQty: 0,
          status: mappedStatus,
          tif: 'DAY',
          symbol: state.symbol
        }, ...state.orders]
      }
    })
  },

  resyncSnapshot: async () => {
    const sessionId = get().sessionId
    if (!sessionId) return
    const snapshot = await fetchSnapshot(sessionId)
    get().updateFromMarketData(snapshot)
  },

  placeOrder: async (side, type, price, qty, tif) => {
    const { sessionId, userId } = get()
    if (!sessionId) return
    await placeOrder(sessionId, {
      user_id: userId,
      side: side === 'BUY' ? 'B' : 'S',
      type: type === 'LMT' ? 'LIMIT' : 'MARKET',
      qty,
      price: type === 'LMT' ? price : undefined,
      tif
    })
  },

  cancelOrderById: async (id) => {
    const sessionId = get().sessionId
    if (!sessionId) return
    await cancelOrder(sessionId, id)
  },

  cancelAll: async () => {
    const active = get().orders.filter(o => ['NEW', 'ACK', 'LIVE', 'PARTIAL'].includes(o.status))
    await Promise.all(active.map(o => get().cancelOrderById(o.id)))
  },

  modifyOrder: () => {},
  startEngine: () => {},
  stopEngine: () => {},
  tickEngine: () => {},
}))
