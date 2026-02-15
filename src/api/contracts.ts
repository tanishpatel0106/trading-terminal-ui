export type SessionMode = 'LIVE' | 'HISTORICAL_REPLAY' | 'LP_REPLAY'

export interface Level {
  price: number
  size: number
  orders: number
}

export interface MarketDataSnapshot {
  event: 'snapshot'
  bids: Level[]
  asks: Level[]
  ts: number
}

export interface MarketDataUpdate {
  event: 'md'
  type: 'INSERT' | 'CANCEL' | 'DELETE' | 'EXECUTE'
  ts: number
  price?: number
  size?: number
  side?: 'B' | 'S'
}

export interface TradeEvent {
  event: 'trade'
  ts: number
  price: number
  size: number
  aggressor: 'B' | 'S'
}

export interface OrderEvent {
  event: 'order'
  ts: number
  order_id: string
  status: string
  side?: 'B' | 'S'
  price?: number
  qty?: number
  leaves_qty?: number
}
