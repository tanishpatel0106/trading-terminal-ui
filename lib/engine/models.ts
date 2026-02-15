// ── Types & Interfaces ──

export type Side = 'BUY' | 'SELL'
export type OrderType = 'LMT' | 'MKT'
export type TIF = 'DAY' | 'IOC' | 'FOK'
export type OrderStatus = 'NEW' | 'ACK' | 'LIVE' | 'PARTIAL' | 'FILLED' | 'CXL' | 'REJ'
export type SessionState = 'LIVE' | 'REPLAY' | 'PAUSED'

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

export interface Order {
  id: string
  ts: number
  side: Side
  type: OrderType
  price: number
  qty: number
  filledQty: number
  leaves: number
  status: OrderStatus
  tif: TIF
  symbol: string
}

export interface Fill {
  id: string
  ts: number
  orderId: string
  side: Side
  price: number
  qty: number
  liquidity: 'M' | 'T'
  pnlImpact: number
}

export interface LogEntry {
  ts: number
  type: 'ORDER' | 'FILL' | 'REJECT' | 'CANCEL' | 'SYSTEM'
  message: string
  id: string
}

export interface Position {
  symbol: string
  qty: number
  avgPx: number
  realizedPnl: number
  unrealizedPnl: number
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

export const SYMBOLS = ['AAPL', 'MSFT', 'SPY', 'BTC-USD'] as const
export type Symbol = (typeof SYMBOLS)[number]

export const SYMBOL_CONFIG: Record<Symbol, { basePrice: number; tickSize: number; volatility: number }> = {
  'AAPL': { basePrice: 187.50, tickSize: 0.01, volatility: 0.0003 },
  'MSFT': { basePrice: 420.25, tickSize: 0.01, volatility: 0.0003 },
  'SPY': { basePrice: 512.80, tickSize: 0.01, volatility: 0.0002 },
  'BTC-USD': { basePrice: 67250.00, tickSize: 0.50, volatility: 0.0008 },
}
