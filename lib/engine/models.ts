// ── Types & Interfaces ──

export type Side = 'BUY' | 'SELL'
export type SessionState = 'REPLAY' | 'PAUSED'

export interface PriceLevel {
  price: number
  size: number
  ordersCount: number
}

export interface Trade {
  ts: number
  price: number
  size: number
  side: Side
  id: string
}

export interface LogEntry {
  ts: number
  type: 'ORDER' | 'FILL' | 'REJECT' | 'CANCEL' | 'SYSTEM'
  message: string
  id: string
}

export interface BookSnapshot {
  bids: PriceLevel[]
  asks: PriceLevel[]
  mid: number
  spread: number
  lastTradePrice: number
  lastTradeSide: Side
}

export interface MicroStats {
  spread: number
  mid: number
  microprice: number
  imbalance: number
  tradesPerSec: number
  volume60s: number
  bookUpdateRate: number
}

export const SYMBOLS = ['AMZN', 'MSFT'] as const
export type Symbol = (typeof SYMBOLS)[number]

export const SYMBOL_CONFIG: Record<Symbol, { basePrice: number; tickSize: number; volatility: number }> = {
  'AMZN': { basePrice: 228.35, tickSize: 0.01, volatility: 0.0003 },
  'MSFT': { basePrice: 30.96, tickSize: 0.01, volatility: 0.0003 },
}
