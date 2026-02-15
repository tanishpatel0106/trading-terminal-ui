'use client'

import { useStore } from '@/lib/store'
import { formatPrice } from '@/lib/format'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-secondary/30 rounded-sm">
      <span className="text-[9px] text-muted-foreground tracking-wider">{label}</span>
      <span className={`text-[11px] font-medium ${color ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

export function MicroStats() {
  const stats = useStore(s => s.stats)
  const symbol = useStore(s => s.symbol)
  const midHistory = useStore(s => s.midHistory)

  const imbalanceColor = stats.imbalance > 0.2 ? 'text-buy' : stats.imbalance < -0.2 ? 'text-sell' : 'text-foreground'
  const imbalanceStr = `${stats.imbalance > 0 ? '+' : ''}${(stats.imbalance * 100).toFixed(1)}%`

  const chartData = midHistory.map((mid, i) => ({ i, mid }))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center h-6 px-2 text-[10px] text-muted-foreground font-medium tracking-wider border-b border-border bg-secondary/30">
        MICROSTRUCTURE
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <StatCard label="SPREAD" value={formatPrice(stats.spread, symbol)} />
        <StatCard label="MID" value={formatPrice(stats.mid, symbol)} color="text-primary" />
        <StatCard label="MICROPRICE" value={formatPrice(stats.microprice, symbol)} />
        <StatCard label="IMBALANCE" value={imbalanceStr} color={imbalanceColor} />
        <StatCard label="TRADES/SEC" value={String(stats.tradesPerSec)} />
        <StatCard label="VOL (60s)" value={String(stats.volume60s)} />
        <StatCard label="UPD/SEC" value={String(stats.bookUpdateRate)} />
      </div>
      {/* Mini sparkline */}
      {chartData.length > 2 && (
        <div className="px-1 mt-1">
          <div className="text-[9px] text-muted-foreground px-1 mb-0.5 tracking-wider">MID PRICE</div>
          <div className="h-12 bg-secondary/20 rounded-sm p-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="mid"
                  stroke="hsl(210, 100%, 55%)"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
