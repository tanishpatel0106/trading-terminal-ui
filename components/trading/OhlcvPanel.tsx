'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '@/lib/store'
import { formatPrice } from '@/lib/format'

type Timeframe = {
  label: string
  seconds: number
}

type Candle = {
  bucketStart: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const TIMEFRAMES: Timeframe[] = [
  { label: '1s', seconds: 1 },
  { label: '5s', seconds: 5 },
  { label: '15s', seconds: 15 },
  { label: '1m', seconds: 60 },
]

function aggregateCandles(
  trades: Array<{ ts: number; price: number; size: number }>,
  timeframeSeconds: number,
  maxCandles = 120,
): Candle[] {
  if (trades.length === 0) return []

  const sorted = [...trades].sort((a, b) => a.ts - b.ts)
  const buckets = new Map<number, Candle>()

  for (const trade of sorted) {
    const bucketStart = Math.floor(trade.ts / 1000 / timeframeSeconds) * timeframeSeconds * 1000
    const existing = buckets.get(bucketStart)

    if (!existing) {
      buckets.set(bucketStart, {
        bucketStart,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.size,
      })
      continue
    }

    existing.high = Math.max(existing.high, trade.price)
    existing.low = Math.min(existing.low, trade.price)
    existing.close = trade.price
    existing.volume += trade.size
  }

  return [...buckets.values()].sort((a, b) => a.bucketStart - b.bucketStart).slice(-maxCandles)
}

function formatCandleTime(ts: number, seconds: number) {
  const d = new Date(ts)
  if (seconds >= 60) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function OhlcvPanel() {
  const symbol = useStore(s => s.symbol)
  const trades = useStore(s => s.trades)
  const mid = useStore(s => s.book.mid)
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[1])

  const candles = useMemo(() => aggregateCandles(trades, timeframe.seconds), [trades, timeframe.seconds])
  const latest = candles[candles.length - 1]
  const latestPrice = latest?.close ?? mid

  return (
    <div className="flex flex-col h-full border-b border-border bg-card/40">
      <div className="h-7 px-2 border-b border-border flex items-center gap-2 text-[10px] tracking-wider text-muted-foreground">
        <span className="font-medium">OHLCV</span>
        <span className="text-foreground/70">{symbol}</span>
        {latest ? (
          <span className="text-foreground/80">
            O {formatPrice(latest.open, symbol)} H {formatPrice(latest.high, symbol)} L {formatPrice(latest.low, symbol)} C {formatPrice(latest.close, symbol)} V {latest.volume}
          </span>
        ) : (
          <span className="text-foreground/60">Waiting for trades…</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf)}
              className={`h-5 px-1.5 rounded text-[10px] transition-colors ${
                timeframe.label === tf.label
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2">
        {candles.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Waiting for trades to build candles...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="bucketStart"
                tickFormatter={(value) => formatCandleTime(value, timeframe.seconds)}
                minTickGap={24}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                domain={['dataMin - 0.01', 'dataMax + 0.01']}
                tick={{ fontSize: 10 }}
                tickFormatter={v => formatPrice(v, symbol)}
                width={60}
              />
              <YAxis yAxisId="volume" hide domain={[0, 'dataMax * 1.5']} />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'volume') return [value, 'Volume']
                  return [formatPrice(Number(value), symbol), name.toUpperCase()]
                }}
                labelFormatter={(label) => formatCandleTime(Number(label), timeframe.seconds)}
              />

              <ReferenceLine yAxisId="price" y={latestPrice} stroke="hsl(var(--primary))" strokeOpacity={0.35} />

              <Bar yAxisId="volume" dataKey="volume" barSize={6} fill="hsl(var(--muted-foreground))" opacity={0.22} isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="open" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="high" stroke="#22c55e" strokeWidth={1.2} dot={false} isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={1.2} dot={false} isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="close" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
