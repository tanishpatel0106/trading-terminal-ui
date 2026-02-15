'use client'

import { useState, memo } from 'react'
import { useStore } from '@/lib/store'
import { formatPrice, formatTime } from '@/lib/format'
import type { Side } from '@/lib/engine/models'

type Filter = 'ALL' | 'BUY' | 'SELL'

const TradeRow = memo(function TradeRow({ ts, price, size, side, symbol }: {
  ts: number; price: number; size: number; side: Side; symbol: string
}) {
  return (
    <div className={`grid grid-cols-[56px_1fr_40px_28px] gap-0 h-5 items-center text-[10px] border-b border-border/10 px-1 flash-trade`}>
      <div className="text-muted-foreground">{formatTime(ts)}</div>
      <div className={side === 'BUY' ? 'text-buy' : 'text-sell'}>{formatPrice(price, symbol)}</div>
      <div className="text-right text-foreground">{size}</div>
      <div className={`text-center text-[9px] font-medium ${side === 'BUY' ? 'text-buy' : 'text-sell'}`}>
        {side === 'BUY' ? 'B' : 'S'}
      </div>
    </div>
  )
})

export function TimeSales() {
  const trades = useStore(s => s.trades)
  const symbol = useStore(s => s.symbol)
  const [filter, setFilter] = useState<Filter>('ALL')

  const filtered = filter === 'ALL'
    ? trades
    : trades.filter(t => t.side === filter)

  const display = filtered.slice(-100).reverse()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-6 px-2 gap-2 text-[10px] text-muted-foreground font-medium tracking-wider border-b border-border bg-secondary/30 shrink-0">
        <span>TIME & SALES</span>
        <div className="ml-auto flex gap-1">
          {(['ALL', 'BUY', 'SELL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as Filter)}
              className={`px-1.5 h-4 text-[9px] rounded-sm transition-colors ${
                filter === f
                  ? f === 'BUY' ? 'bg-buy/20 text-buy' : f === 'SELL' ? 'bg-sell/20 text-sell' : 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {/* Header */}
      <div className="grid grid-cols-[56px_1fr_40px_28px] gap-0 h-5 items-center text-[9px] text-muted-foreground font-medium border-b border-border/50 bg-secondary/20 px-1 shrink-0">
        <div>TIME</div>
        <div>PRICE</div>
        <div className="text-right">SIZE</div>
        <div className="text-center">SD</div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {display.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground/50">
            No trades
          </div>
        ) : (
          display.map(trade => (
            <TradeRow key={trade.id} {...trade} symbol={symbol} />
          ))
        )}
      </div>
    </div>
  )
}
