'use client'

import { memo, useRef, useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { formatPrice, formatSize } from '@/lib/format'

interface LadderRowProps {
  price: number
  bidSize: number
  bidCount: number
  askSize: number
  askCount: number
  isBestBid: boolean
  isBestAsk: boolean
  isSpread: boolean
  isMid: boolean
  isLastTrade: boolean
  lastTradeSide: 'BUY' | 'SELL'
  bidHeat: number
  askHeat: number
  isFocused: boolean
  rowIndex: number
  symbol: string
}

const LadderRow = memo(function LadderRow({
  price, bidSize, bidCount, askSize, askCount,
  isBestBid, isBestAsk, isSpread, isMid, isLastTrade, lastTradeSide,
  bidHeat, askHeat, isFocused, symbol,
}: LadderRowProps) {
  const prevBidRef = useRef(bidSize)
  const prevAskRef = useRef(askSize)
  const [bidFlash, setBidFlash] = useState('')
  const [askFlash, setAskFlash] = useState('')

  useEffect(() => {
    if (bidSize > prevBidRef.current + 5) {
      setBidFlash('flash-green')
      const t = setTimeout(() => setBidFlash(''), 400)
      return () => clearTimeout(t)
    }
    prevBidRef.current = bidSize
  }, [bidSize])

  useEffect(() => {
    if (askSize > prevAskRef.current + 5) {
      setAskFlash('flash-red')
      const t = setTimeout(() => setAskFlash(''), 400)
      return () => clearTimeout(t)
    }
    prevAskRef.current = askSize
  }, [askSize])

  if (isSpread) {
    return (
      <div className="grid grid-cols-7 h-6 items-center text-[11px] bg-secondary/30 border-y border-border/50">
        <div className="col-span-3" />
        <div className="text-center text-muted-foreground text-[10px] font-medium tracking-wider">SPREAD</div>
        <div className="col-span-3" />
      </div>
    )
  }

  const hasBid = bidSize > 0
  const hasAsk = askSize > 0

  return (
    <div
      className={`grid grid-cols-7 h-6 items-center text-[11px] border-b border-border/20 transition-colors duration-75 ${
        isFocused ? 'ring-1 ring-primary/50 bg-primary/10' : ''
      } ${isLastTrade ? (lastTradeSide === 'BUY' ? 'border-l-2 border-l-buy' : 'border-l-2 border-l-sell') : ''}`}
    >
      {/* Bid side */}
      <div
        className={`h-full flex items-center justify-end px-1 ${bidFlash} ${
          isBestBid ? 'text-buy font-semibold' : 'text-buy/70'
        }`}
        style={hasBid ? { background: `rgba(34, 197, 94, ${bidHeat * 0.15})` } : undefined}
      >
        {hasBid ? formatSize(bidSize) : ''}
      </div>

      <div className={`h-full flex items-center justify-end px-1 text-[10px] ${isBestBid ? 'text-buy/80' : 'text-muted-foreground/50'}`}>
        {hasBid && bidCount > 0 ? bidCount : ''}
      </div>

      {/* Bid depth heat */}
      <div
        className="h-full"
        style={hasBid ? { background: `rgba(34, 197, 94, ${bidHeat * 0.2})` } : undefined}
      />

      {/* Price */}
      <div className={`h-full flex items-center justify-center px-1 font-medium ${
        isBestBid ? 'text-buy' : isBestAsk ? 'text-sell' : isMid ? 'text-primary' : 'text-foreground/80'
      }`}>
        {formatPrice(price, symbol)}
      </div>

      {/* Ask depth heat */}
      <div
        className="h-full"
        style={hasAsk ? { background: `rgba(239, 68, 68, ${askHeat * 0.2})` } : undefined}
      />

      <div className={`h-full flex items-center justify-start px-1 text-[10px] ${isBestAsk ? 'text-sell/80' : 'text-muted-foreground/50'}`}>
        {hasAsk && askCount > 0 ? askCount : ''}
      </div>

      {/* Ask side */}
      <div
        className={`h-full flex items-center justify-start px-1 ${askFlash} ${
          isBestAsk ? 'text-sell font-semibold' : 'text-sell/70'
        }`}
        style={hasAsk ? { background: `rgba(239, 68, 68, ${askHeat * 0.15})` } : undefined}
      >
        {hasAsk ? formatSize(askSize) : ''}
      </div>
    </div>
  )
})

export function DomLadder() {
  const book = useStore(s => s.book)
  const symbol = useStore(s => s.symbol)
  const focusedIndex = useStore(s => s.focusedLadderIndex)
  const ladderRef = useRef<HTMLDivElement>(null)

  // Build unified ladder
  const { bids, asks, lastTradePrice, lastTradeSide } = book
  if (bids.length === 0 || asks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Waiting for market data...
      </div>
    )
  }

  const maxBidSize = Math.max(...bids.map(b => b.size), 1)
  const maxAskSize = Math.max(...asks.map(a => a.size), 1)
  const bestBid = bids[0].price
  const bestAsk = asks[0].price
  const mid = (bestBid + bestAsk) / 2

  const rows: Array<{
    price: number; bidSize: number; bidCount: number; askSize: number; askCount: number
    isBestBid: boolean; isBestAsk: boolean; isSpread: boolean; isMid: boolean
    isLastTrade: boolean; lastTradeSide: 'BUY' | 'SELL'
    bidHeat: number; askHeat: number
  }> = []

  // Asks (reversed so highest at top)
  const displayAsks = asks.slice(0, 20).reverse()
  for (const a of displayAsks) {
    rows.push({
      price: a.price,
      bidSize: 0, bidCount: 0,
      askSize: a.size, askCount: a.ordersCount,
      isBestBid: false, isBestAsk: a.price === bestAsk,
      isSpread: false,
      isMid: false,
      isLastTrade: Math.abs(a.price - lastTradePrice) < (asks[0].price - (bids[0]?.price ?? 0)) * 0.1,
      lastTradeSide: lastTradeSide,
      bidHeat: 0,
      askHeat: a.size / maxAskSize,
    })
  }

  // Spread row
  rows.push({
    price: mid, bidSize: 0, bidCount: 0, askSize: 0, askCount: 0,
    isBestBid: false, isBestAsk: false, isSpread: true, isMid: true,
    isLastTrade: false, lastTradeSide: 'BUY', bidHeat: 0, askHeat: 0,
  })

  // Bids
  const displayBids = bids.slice(0, 20)
  for (const b of displayBids) {
    rows.push({
      price: b.price,
      bidSize: b.size, bidCount: b.ordersCount,
      askSize: 0, askCount: 0,
      isBestBid: b.price === bestBid, isBestAsk: false,
      isSpread: false,
      isMid: false,
      isLastTrade: Math.abs(b.price - lastTradePrice) < (asks[0].price - (bids[0]?.price ?? 0)) * 0.1,
      lastTradeSide: lastTradeSide,
      bidHeat: b.size / maxBidSize,
      askHeat: 0,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-7 h-7 items-center text-[10px] text-muted-foreground font-medium border-b border-border bg-secondary/40 px-0 shrink-0">
        <div className="text-right px-1">BID SZ</div>
        <div className="text-right px-1">ORDS</div>
        <div className="text-center px-1">DEPTH</div>
        <div className="text-center px-1">PRICE</div>
        <div className="text-center px-1">DEPTH</div>
        <div className="text-left px-1">ORDS</div>
        <div className="text-left px-1">ASK SZ</div>
      </div>
      {/* Ladder body */}
      <div ref={ladderRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {rows.map((row, i) => (
          <LadderRow
            key={row.isSpread ? 'spread' : row.price}
            {...row}
            rowIndex={i}
            isFocused={focusedIndex === i}
            symbol={symbol}
          />
        ))}
      </div>
      {/* Footer stats */}
      <div className="flex items-center justify-between h-6 px-2 text-[10px] text-muted-foreground border-t border-border bg-secondary/30 shrink-0">
        <span>Best Bid: <span className="text-buy">{formatPrice(bestBid, symbol)}</span></span>
        <span>Spread: <span className="text-foreground">{formatPrice(book.spread, symbol)}</span></span>
        <span>Best Ask: <span className="text-sell">{formatPrice(bestAsk, symbol)}</span></span>
      </div>
    </div>
  )
}
