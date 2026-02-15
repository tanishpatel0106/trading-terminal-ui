'use client'

import { create } from 'zustand'
import { MarketEngine } from './engine/marketEngine'
import {
  createOrder, acknowledgeOrder, activateOrder, cancelOrder, tryFillOrder,
} from './engine/orderFsm'
import type {
  Side, OrderType, TIF, Order, Fill, Trade, BookSnapshot, MicroStats,
  LogEntry, Position, SessionState, Symbol,
} from './engine/models'

let logId = 0
function uid() { return `log-${++logId}` }

interface Settings {
  ladderLevels: number
  updateSpeed: number
  density: 'compact' | 'comfy'
}

interface TradingStore {
  // Session
  sessionState: SessionState
  replaySpeed: number
  userRole: 'TRADER' | 'ADMIN'
  latency: number

  // Symbol
  symbol: Symbol

  // Market Data
  book: BookSnapshot
  stats: MicroStats
  trades: Trade[]
  midHistory: number[]

  // Orders & Fills
  orders: Order[]
  fills: Fill[]
  logs: LogEntry[]
  position: Position

  // UI
  selectedSide: Side
  selectedType: OrderType
  selectedTif: TIF
  selectedQty: number
  selectedPrice: number
  focusedLadderIndex: number | null
  dockTab: 'logs' | 'risk' | 'replay' | 'settings'
  settings: Settings

  // Engine ref
  engine: MarketEngine | null
  intervalId: ReturnType<typeof setInterval> | null

  // Actions
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

  placeOrder: (side: Side, type: OrderType, price: number, qty: number, tif: TIF) => void
  cancelOrderById: (id: string) => void
  cancelAll: () => void
  modifyOrder: (id: string, updates: { price?: number; qty?: number }) => void

  startEngine: () => void
  stopEngine: () => void
  tickEngine: () => void
}

export const useStore = create<TradingStore>((set, get) => ({
  // Initial state
  sessionState: 'PAUSED',
  replaySpeed: 1,
  userRole: 'TRADER',
  latency: 3,

  symbol: 'AAPL',

  book: {
    bids: [], asks: [], mid: 0, spread: 0, lastTradePrice: 0, lastTradeSide: 'BUY',
  },
  stats: {
    spread: 0, mid: 0, microprice: 0, imbalance: 0,
    tradesPerSec: 0, volume60s: 0, bookUpdateRate: 0,
  },
  trades: [],
  midHistory: [],

  orders: [],
  fills: [],
  logs: [],
  position: { symbol: 'AAPL', qty: 0, avgPx: 0, realizedPnl: 0, unrealizedPnl: 0 },

  selectedSide: 'BUY',
  selectedType: 'LMT',
  selectedTif: 'DAY',
  selectedQty: 100,
  selectedPrice: 0,
  focusedLadderIndex: null,
  dockTab: 'logs',
  settings: { ladderLevels: 25, updateSpeed: 200, density: 'compact' },

  engine: null,
  intervalId: null,

  setSymbol: (s) => {
    const engine = get().engine ?? new MarketEngine(s)
    engine.switchSymbol(s)
    set({
      symbol: s,
      engine,
      trades: [],
      midHistory: [],
      position: { symbol: s, qty: 0, avgPx: 0, realizedPnl: 0, unrealizedPnl: 0 },
    })
  },

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
  updateSettings: (s) => {
    const current = get().settings
    const newSettings = { ...current, ...s }
    set({ settings: newSettings })
    // If update speed changed and engine is running, restart
    if (s.updateSpeed && get().intervalId) {
      get().stopEngine()
      setTimeout(() => get().startEngine(), 50)
    }
  },

  placeOrder: (side, type, price, qty, tif) => {
    const { symbol, book } = get()
    const order = createOrder(side, type, price, qty, tif, symbol)

    // Log
    const log: LogEntry = {
      ts: Date.now(),
      type: 'ORDER',
      message: `${side} ${type} ${qty}@${price.toFixed(2)} ${tif} [${order.id}]`,
      id: uid(),
    }

    // Process order lifecycle: NEW -> ACK -> try fill
    let processed = acknowledgeOrder(order)

    if (type === 'MKT' || (type === 'LMT' && book.bids.length > 0)) {
      const bestBid = book.bids[0]?.price ?? 0
      const bestAsk = book.asks[0]?.price ?? 0
      const bestBidSize = book.bids[0]?.size ?? 0
      const bestAskSize = book.asks[0]?.size ?? 0
      const result = tryFillOrder(processed, bestBid, bestAsk, bestBidSize, bestAskSize)
      processed = result.order

      if (result.fills.length > 0) {
        const newFills = result.fills.map(f => ({
          ...f,
          pnlImpact: side === 'BUY' ? -(f.price * f.qty) : f.price * f.qty,
        }))

        // Update position
        const pos = { ...get().position }
        for (const fill of newFills) {
          if (fill.side === 'BUY') {
            const newQty = pos.qty + fill.qty
            pos.avgPx = pos.qty === 0 ? fill.price : (pos.avgPx * pos.qty + fill.price * fill.qty) / newQty
            pos.qty = newQty
          } else {
            if (pos.qty > 0) {
              const sellQty = Math.min(fill.qty, pos.qty)
              pos.realizedPnl += (fill.price - pos.avgPx) * sellQty
              pos.qty -= sellQty
              if (pos.qty <= 0) { pos.qty = 0; pos.avgPx = 0 }
            } else {
              const newQty = pos.qty - fill.qty
              pos.avgPx = pos.qty === 0 ? fill.price : (pos.avgPx * Math.abs(pos.qty) + fill.price * fill.qty) / Math.abs(newQty)
              pos.qty = newQty
            }
          }
        }

        const fillLogs = newFills.map(f => ({
          ts: f.ts,
          type: 'FILL' as const,
          message: `FILL ${f.side} ${f.qty}@${f.price.toFixed(2)} [${f.orderId}]`,
          id: uid(),
        }))

        set(state => ({
          fills: [...newFills, ...state.fills].slice(0, 200),
          logs: [...fillLogs, ...state.logs].slice(0, 500),
          position: pos,
        }))
      }

      if (processed.status === 'REJ') {
        set(state => ({
          logs: [{ ts: Date.now(), type: 'REJECT', message: `REJECT ${order.id}: ${tif} not satisfiable`, id: uid() }, ...state.logs].slice(0, 500),
        }))
      }
    } else {
      processed = activateOrder(processed)
    }

    set(state => ({
      orders: [processed, ...state.orders].slice(0, 200),
      logs: [log, ...state.logs].slice(0, 500),
    }))
  },

  cancelOrderById: (id) => {
    set(state => {
      const orders = state.orders.map(o => o.id === id ? cancelOrder(o) : o)
      const cancelled = orders.find(o => o.id === id)
      const log: LogEntry = {
        ts: Date.now(), type: 'CANCEL',
        message: `CANCEL ${id} ${cancelled?.status ?? ''}`,
        id: uid(),
      }
      return { orders, logs: [log, ...state.logs].slice(0, 500) }
    })
  },

  cancelAll: () => {
    set(state => {
      const orders = state.orders.map(o =>
        (o.status === 'LIVE' || o.status === 'PARTIAL' || o.status === 'ACK' || o.status === 'NEW')
          ? cancelOrder(o)
          : o
      )
      const log: LogEntry = {
        ts: Date.now(), type: 'CANCEL', message: 'CANCEL ALL', id: uid(),
      }
      return { orders, logs: [log, ...state.logs].slice(0, 500) }
    })
  },

  modifyOrder: (id, updates) => {
    set(state => ({
      orders: state.orders.map(o => {
        if (o.id !== id) return o
        if (o.status === 'FILLED' || o.status === 'CXL' || o.status === 'REJ') return o
        return {
          ...o,
          price: updates.price ?? o.price,
          qty: updates.qty ?? o.qty,
          leaves: (updates.qty ?? o.qty) - o.filledQty,
        }
      }),
    }))
  },

  startEngine: () => {
    let engine = get().engine
    if (!engine) {
      engine = new MarketEngine(get().symbol)
      set({ engine })
    }

    const speed = get().settings.updateSpeed
    const id = setInterval(() => {
      if (get().sessionState !== 'PAUSED') {
        get().tickEngine()
      }
    }, speed)

    set({ intervalId: id, sessionState: 'LIVE' })
  },

  stopEngine: () => {
    const id = get().intervalId
    if (id) clearInterval(id)
    set({ intervalId: null, sessionState: 'PAUSED' })
  },

  tickEngine: () => {
    const engine = get().engine
    if (!engine) return

    const { snapshot, newTrades, stats } = engine.tick()
    const latency = Math.round(1 + Math.random() * 5)

    // Check resting orders for fills
    const updatedOrders = [...get().orders]
    const newFills: Fill[] = []

    for (let i = 0; i < updatedOrders.length; i++) {
      const o = updatedOrders[i]
      if (o.status !== 'LIVE' && o.status !== 'PARTIAL') continue

      const bestBid = snapshot.bids[0]?.price ?? 0
      const bestAsk = snapshot.asks[0]?.price ?? 0
      const bestBidSize = snapshot.bids[0]?.size ?? 0
      const bestAskSize = snapshot.asks[0]?.size ?? 0

      const result = tryFillOrder(o, bestBid, bestAsk, bestBidSize, bestAskSize)
      updatedOrders[i] = result.order
      newFills.push(...result.fills)
    }

    // Update position with new fills
    if (newFills.length > 0) {
      const pos = { ...get().position }
      for (const fill of newFills) {
        if (fill.side === 'BUY') {
          const newQty = pos.qty + fill.qty
          pos.avgPx = pos.qty === 0 ? fill.price : (pos.avgPx * pos.qty + fill.price * fill.qty) / newQty
          pos.qty = newQty
        } else {
          if (pos.qty > 0) {
            const sellQty = Math.min(fill.qty, pos.qty)
            pos.realizedPnl += (fill.price - pos.avgPx) * sellQty
            pos.qty -= sellQty
          } else {
            pos.qty -= fill.qty
            pos.avgPx = fill.price
          }
        }
      }
      // Unrealized PnL
      pos.unrealizedPnl = pos.qty !== 0 ? (snapshot.mid - pos.avgPx) * pos.qty : 0

      const fillLogs = newFills.map(f => ({
        ts: f.ts, type: 'FILL' as const,
        message: `FILL ${f.side} ${f.qty}@${f.price.toFixed(2)} [${f.orderId}]`,
        id: uid(),
      }))

      set(state => ({
        orders: updatedOrders,
        fills: [...newFills.map(f => ({ ...f, pnlImpact: f.side === 'BUY' ? -(f.price * f.qty) : f.price * f.qty })), ...state.fills].slice(0, 200),
        logs: [...fillLogs, ...state.logs].slice(0, 500),
        position: pos,
      }))
    } else {
      // Update unrealized PnL
      const pos = { ...get().position }
      pos.unrealizedPnl = pos.qty !== 0 ? (snapshot.mid - pos.avgPx) * pos.qty : 0
      set({ orders: updatedOrders, position: pos })
    }

    set(state => ({
      book: snapshot,
      stats,
      trades: [...state.trades, ...newTrades].slice(-500),
      midHistory: [...state.midHistory, snapshot.mid].slice(-120),
      latency,
    }))
  },
}))
