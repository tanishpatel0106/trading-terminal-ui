import {
  type PriceLevel, type Trade, type Side, type BookSnapshot, type MicroStats,
  type Symbol, SYMBOL_CONFIG,
} from './models'

let idCounter = 0
function uid() { return `t-${++idCounter}-${Date.now()}` }

function roundToTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export class MarketEngine {
  symbol: Symbol
  mid: number
  tickSize: number
  volatility: number
  bids: PriceLevel[] = []
  asks: PriceLevel[] = []
  trades: Trade[] = []
  private recentTradeTimestamps: number[] = []
  private recentVolume: { ts: number; size: number }[] = []
  private updateCount = 0
  private lastUpdateCountReset = Date.now()
  bookUpdateRate = 0

  constructor(symbol: Symbol) {
    this.symbol = symbol
    const cfg = SYMBOL_CONFIG[symbol]
    this.mid = cfg.basePrice
    this.tickSize = cfg.tickSize
    this.volatility = cfg.volatility
    this.generateBook()
  }

  switchSymbol(symbol: Symbol) {
    const cfg = SYMBOL_CONFIG[symbol]
    this.symbol = symbol
    this.mid = cfg.basePrice
    this.tickSize = cfg.tickSize
    this.volatility = cfg.volatility
    this.trades = []
    this.recentTradeTimestamps = []
    this.recentVolume = []
    this.generateBook()
  }

  private generateBook() {
    const levels = 25
    this.bids = []
    this.asks = []
    const halfSpread = this.tickSize * (1 + Math.random() * 2)
    const bestBid = roundToTick(this.mid - halfSpread, this.tickSize)
    const bestAsk = roundToTick(this.mid + halfSpread, this.tickSize)

    for (let i = 0; i < levels; i++) {
      const depthMultiplier = 1 + i * 0.5 + Math.random() * 2
      this.bids.push({
        price: roundToTick(bestBid - i * this.tickSize, this.tickSize),
        size: Math.round(10 + depthMultiplier * (20 + Math.random() * 40)),
        ordersCount: Math.round(1 + i * 0.3 + Math.random() * 3),
      })
      this.asks.push({
        price: roundToTick(bestAsk + i * this.tickSize, this.tickSize),
        size: Math.round(10 + depthMultiplier * (20 + Math.random() * 40)),
        ordersCount: Math.round(1 + i * 0.3 + Math.random() * 3),
      })
    }
  }

  tick(): { snapshot: BookSnapshot; newTrades: Trade[]; stats: MicroStats } {
    this.updateCount++
    const now = Date.now()

    // Random walk mid
    const jump = Math.random() < 0.02 ? (Math.random() - 0.5) * this.mid * this.volatility * 10 : 0
    const drift = (Math.random() - 0.5) * this.mid * this.volatility
    this.mid = roundToTick(this.mid + drift + jump, this.tickSize)
    if (this.mid <= 0) this.mid = this.tickSize * 10

    // Rebuild around new mid
    const halfSpread = this.tickSize * (1 + Math.random() * 1.5)
    const bestBid = roundToTick(this.mid - halfSpread, this.tickSize)
    const bestAsk = roundToTick(this.mid + halfSpread, this.tickSize)

    const prevBids = new Map(this.bids.map(b => [b.price, b.size]))
    const prevAsks = new Map(this.asks.map(a => [a.price, a.size]))

    this.bids = []
    this.asks = []
    const levels = 25

    for (let i = 0; i < levels; i++) {
      const depthMultiplier = 1 + i * 0.5 + Math.random() * 1.5
      const bidPrice = roundToTick(bestBid - i * this.tickSize, this.tickSize)
      const askPrice = roundToTick(bestAsk + i * this.tickSize, this.tickSize)

      const prevBidSize = prevBids.get(bidPrice) ?? 0
      const prevAskSize = prevAsks.get(askPrice) ?? 0

      const bidJitter = (Math.random() - 0.5) * 20
      const askJitter = (Math.random() - 0.5) * 20

      this.bids.push({
        price: bidPrice,
        size: Math.max(1, Math.round(prevBidSize > 0 ? prevBidSize + bidJitter : 10 + depthMultiplier * (20 + Math.random() * 40))),
        ordersCount: Math.max(1, Math.round(1 + i * 0.3 + Math.random() * 3)),
      })
      this.asks.push({
        price: askPrice,
        size: Math.max(1, Math.round(prevAskSize > 0 ? prevAskSize + askJitter : 10 + depthMultiplier * (20 + Math.random() * 40))),
        ordersCount: Math.max(1, Math.round(1 + i * 0.3 + Math.random() * 3)),
      })
    }

    // Generate random trades
    const newTrades: Trade[] = []
    if (Math.random() < 0.4) {
      const side: Side = Math.random() < 0.5 ? 'BUY' : 'SELL'
      const price = side === 'BUY' ? bestAsk : bestBid
      const size = Math.round(1 + Math.random() * 50)
      const trade: Trade = { ts: now, price, size, side, id: uid() }
      newTrades.push(trade)
      this.trades.push(trade)
      this.recentTradeTimestamps.push(now)
      this.recentVolume.push({ ts: now, size })
      if (this.trades.length > 500) this.trades = this.trades.slice(-500)
    }

    // Clean old stats
    const cutoff60 = now - 60000
    const cutoff1 = now - 1000
    this.recentTradeTimestamps = this.recentTradeTimestamps.filter(t => t > cutoff1)
    this.recentVolume = this.recentVolume.filter(v => v.ts > cutoff60)

    // Book update rate (per second)
    if (now - this.lastUpdateCountReset > 1000) {
      this.bookUpdateRate = this.updateCount
      this.updateCount = 0
      this.lastUpdateCountReset = now
    }

    // Compute stats
    const bidTop = this.bids[0]
    const askTop = this.asks[0]
    const spread = askTop.price - bidTop.price
    const mid = (bidTop.price + askTop.price) / 2

    // Microprice (size-weighted mid)
    const microprice = (bidTop.price * askTop.size + askTop.price * bidTop.size) / (bidTop.size + askTop.size)

    // Imbalance top 5 levels
    const topN = 5
    const bidDepth = this.bids.slice(0, topN).reduce((s, l) => s + l.size, 0)
    const askDepth = this.asks.slice(0, topN).reduce((s, l) => s + l.size, 0)
    const imbalance = bidDepth + askDepth > 0 ? (bidDepth - askDepth) / (bidDepth + askDepth) : 0

    const stats: MicroStats = {
      spread,
      mid,
      microprice,
      imbalance: clamp(imbalance, -1, 1),
      tradesPerSec: this.recentTradeTimestamps.length,
      volume60s: this.recentVolume.reduce((s, v) => s + v.size, 0),
      bookUpdateRate: this.bookUpdateRate,
    }

    const lastTrade = this.trades.length > 0 ? this.trades[this.trades.length - 1] : null
    const snapshot: BookSnapshot = {
      bids: [...this.bids],
      asks: [...this.asks],
      mid,
      spread,
      lastTradePrice: lastTrade?.price ?? mid,
      lastTradeSide: lastTrade?.side ?? 'BUY',
    }

    return { snapshot, newTrades, stats }
  }
}
