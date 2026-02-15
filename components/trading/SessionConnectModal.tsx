'use client'

import { useState } from 'react'
import { createSession, startSession } from '@/src/api/sessions'
import { useStore } from '@/lib/store'
import { SYMBOLS } from '@/lib/engine/models'

export function SessionConnectModal() {
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<'LIVE' | 'HISTORICAL_REPLAY'>('LIVE')
  const [symbol, setSymbol] = useState('AAPL')
  const [userId, setUserId] = useState('trader1')
  const connectSession = useStore(s => s.connectSession)
  const setStoreUserId = useStore(s => s.setUserId)
  const setSymbolStore = useStore(s => s.setSymbol)

  const handleCreate = async () => {
    setStoreUserId(userId)
    setSymbolStore(symbol as any)
    const created = await createSession(mode, symbol)
    await startSession(created.session_id)
    await connectSession(created.session_id)
    localStorage.setItem('tt.session_id', created.session_id)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="w-[420px] bg-card border border-border rounded p-4 space-y-3">
        <h2 className="text-sm font-semibold">Connect / Create Session</h2>
        <input className="w-full h-9 bg-secondary px-2 text-sm" value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_id" />
        <select className="w-full h-9 bg-secondary px-2 text-sm" value={symbol} onChange={e => setSymbol(e.target.value)}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="w-full h-9 bg-secondary px-2 text-sm" value={mode} onChange={e => setMode(e.target.value as any)}>
          <option value="LIVE">LIVE</option>
          <option value="HISTORICAL_REPLAY">REPLAY</option>
        </select>
        <button className="w-full h-9 bg-primary text-primary-foreground text-sm" onClick={handleCreate}>Create Session</button>
      </div>
    </div>
  )
}
