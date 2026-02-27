'use client'

import { useState, useEffect } from 'react'
import { createSession, startSession, listStocks, type StockInfo } from '@/src/api/sessions'
import { useStore } from '@/lib/store'

export function SessionConnectModal() {
  const [stocks, setStocks] = useState<StockInfo[]>([])
  const [selectedTicker, setSelectedTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const connectSession = useStore(s => s.connectSession)
  const setSymbolStore = useStore(s => s.setSymbol)

  useEffect(() => {
    listStocks().then(s => {
      setStocks(s)
      if (s.length > 0) setSelectedTicker(s[0].ticker)
    }).catch(() => {})
  }, [])

  const handleStart = async () => {
    if (!selectedTicker || loading) return
    setLoading(true)
    try {
      setSymbolStore(selectedTicker as any)
      const created = await createSession(selectedTicker)
      await startSession(created.session_id)
      await connectSession(created.session_id)
      localStorage.setItem('tt.session_id', created.session_id)
    } finally {
      setLoading(false)
    }
  }

  const selected = stocks.find(s => s.ticker === selectedTicker)

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="w-[440px] bg-card border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Order Book Replay</h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Select a stock to replay its historical order book data.
          </p>
        </div>

        {stocks.length === 0 ? (
          <div className="text-[11px] text-muted-foreground py-4 text-center">
            Loading available stocks...
          </div>
        ) : (
          <>
            <div>
              <label className="text-[10px] text-muted-foreground tracking-wider">STOCK</label>
              <select
                className="w-full h-9 bg-secondary px-2 text-sm border border-border rounded mt-1"
                value={selectedTicker}
                onChange={e => setSelectedTicker(e.target.value)}
              >
                {stocks.map(s => (
                  <option key={`${s.ticker}-${s.date}`} value={s.ticker}>
                    {s.ticker} ({s.date})
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="bg-secondary/50 rounded p-3 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Ticker</span>
                  <span className="text-foreground font-medium">{selected.ticker}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">{selected.date}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Total Events</span>
                  <span className="text-foreground">{selected.total_events.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              className="w-full h-9 bg-primary text-primary-foreground text-sm font-medium rounded disabled:opacity-50"
              onClick={handleStart}
              disabled={loading || !selectedTicker}
            >
              {loading ? 'Starting...' : 'Start Replay'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
