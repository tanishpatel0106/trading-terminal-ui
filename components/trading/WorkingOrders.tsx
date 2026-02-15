'use client'

import { useStore } from '@/lib/store'
import { formatPrice, formatTimeShort, orderAge } from '@/lib/format'
import { X } from 'lucide-react'
import { useState, useEffect } from 'react'

export function WorkingOrders() {
  const orders = useStore(s => s.orders)
  const cancelOrderById = useStore(s => s.cancelOrderById)
  const symbol = useStore(s => s.symbol)
  const [, setTick] = useState(0)

  // Re-render for age timer every second
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const activeOrders = orders.filter(o =>
    o.status === 'NEW' || o.status === 'ACK' || o.status === 'LIVE' || o.status === 'PARTIAL'
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center h-6 px-2 text-[10px] text-muted-foreground font-medium tracking-wider border-b border-border bg-secondary/30">
        <span>WORKING ORDERS</span>
        <span className="ml-auto text-foreground/60">{activeOrders.length}</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {/* Header */}
        <div className="grid grid-cols-[50px_48px_26px_30px_52px_36px_36px_34px_24px] gap-0 h-5 items-center text-[9px] text-muted-foreground font-medium border-b border-border/50 bg-secondary/20 px-1 sticky top-0 z-10">
          <div>TIME</div>
          <div>ID</div>
          <div>SD</div>
          <div>TYP</div>
          <div className="text-right">PRICE</div>
          <div className="text-right">QTY</div>
          <div className="text-right">LVS</div>
          <div>STS</div>
          <div />
        </div>
        {activeOrders.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground/50">
            No working orders
          </div>
        ) : (
          activeOrders.map(order => (
            <div
              key={order.id}
              className={`grid grid-cols-[50px_48px_26px_30px_52px_36px_36px_34px_24px] gap-0 h-5 items-center text-[10px] border-b border-border/10 px-1 ${
                order.side === 'BUY' ? 'bg-buy/5' : 'bg-sell/5'
              }`}
            >
              <div className="text-muted-foreground">{formatTimeShort(order.ts)}</div>
              <div className="text-muted-foreground truncate text-[9px]">{order.id.slice(-5)}</div>
              <div className={order.side === 'BUY' ? 'text-buy font-medium' : 'text-sell font-medium'}>
                {order.side === 'BUY' ? 'B' : 'S'}
              </div>
              <div className="text-muted-foreground">{order.type}</div>
              <div className="text-right text-foreground">{formatPrice(order.price, symbol)}</div>
              <div className="text-right text-foreground">{order.qty}</div>
              <div className="text-right text-muted-foreground">{order.leaves}</div>
              <div className={`text-[9px] font-medium ${
                order.status === 'LIVE' ? 'text-buy' :
                order.status === 'PARTIAL' ? 'text-warning' :
                'text-muted-foreground'
              }`}>
                {order.status}
              </div>
              <button
                onClick={() => cancelOrderById(order.id)}
                className="flex items-center justify-center h-4 w-4 rounded-sm hover:bg-sell/20 text-muted-foreground hover:text-sell transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function FillsTable() {
  const fills = useStore(s => s.fills)
  const symbol = useStore(s => s.symbol)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center h-6 px-2 text-[10px] text-muted-foreground font-medium tracking-wider border-b border-border bg-secondary/30">
        <span>FILLS</span>
        <span className="ml-auto text-foreground/60">{fills.length}</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="grid grid-cols-[50px_48px_26px_56px_36px_20px_48px] gap-0 h-5 items-center text-[9px] text-muted-foreground font-medium border-b border-border/50 bg-secondary/20 px-1 sticky top-0 z-10">
          <div>TIME</div>
          <div>ORD</div>
          <div>SD</div>
          <div className="text-right">PRICE</div>
          <div className="text-right">QTY</div>
          <div>LQ</div>
          <div className="text-right">PnL</div>
        </div>
        {fills.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[10px] text-muted-foreground/50">
            No fills
          </div>
        ) : (
          fills.slice(0, 50).map(fill => (
            <div
              key={fill.id}
              className="grid grid-cols-[50px_48px_26px_56px_36px_20px_48px] gap-0 h-5 items-center text-[10px] border-b border-border/10 px-1 flash-trade"
            >
              <div className="text-muted-foreground">{formatTimeShort(fill.ts)}</div>
              <div className="text-muted-foreground truncate text-[9px]">{fill.orderId.slice(-5)}</div>
              <div className={fill.side === 'BUY' ? 'text-buy font-medium' : 'text-sell font-medium'}>
                {fill.side === 'BUY' ? 'B' : 'S'}
              </div>
              <div className="text-right text-foreground">{formatPrice(fill.price, symbol)}</div>
              <div className="text-right text-foreground">{fill.qty}</div>
              <div className="text-muted-foreground text-[9px]">{fill.liquidity}</div>
              <div className={`text-right text-[9px] ${fill.pnlImpact >= 0 ? 'text-buy' : 'text-sell'}`}>
                {fill.pnlImpact >= 0 ? '+' : ''}{fill.pnlImpact.toFixed(0)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
