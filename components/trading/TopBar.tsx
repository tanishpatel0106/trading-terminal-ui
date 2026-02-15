'use client'

import { useCallback, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { SYMBOLS } from '@/lib/engine/models'
import { Play, Pause, Square, Wifi } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { pauseSession, setReplaySpeed, startSession, stopSession } from '@/src/api/sessions'

export function TopBar() {
  const symbol = useStore(s => s.symbol)
  const sessionState = useStore(s => s.sessionState)
  const replaySpeed = useStore(s => s.replaySpeed)
  const userRole = useStore(s => s.userRole)
  const latency = useStore(s => s.latency)
  const sessionId = useStore(s => s.sessionId)
  const streamStatus = useStore(s => s.streamStatus)

  const setSymbol = useStore(s => s.setSymbol)
  const setReplaySpeedState = useStore(s => s.setReplaySpeed)
  const setUserRole = useStore(s => s.setUserRole)
  const setSessionState = useStore(s => s.setSessionState)

  const handleStart = async () => {
    if (!sessionId) return
    await startSession(sessionId)
    setSessionState('LIVE')
  }
  const handlePause = async () => {
    if (!sessionId) return
    await pauseSession(sessionId)
    setSessionState('PAUSED')
  }
  const handleStop = async () => {
    if (!sessionId) return
    await stopSession(sessionId)
    setSessionState('PAUSED')
  }

  const sliderValue = useMemo(() => [replaySpeed], [replaySpeed])

  const handleSpeedChange = useCallback(([nextSpeed]: number[]) => {
    if (nextSpeed === replaySpeed) return
    setReplaySpeedState(nextSpeed)
  }, [replaySpeed, setReplaySpeedState])

  const handleSpeedCommit = useCallback(async ([nextSpeed]: number[]) => {
    if (nextSpeed === replaySpeed || !sessionId) return
    await setReplaySpeed(sessionId, nextSpeed)
  }, [replaySpeed, sessionId])

  return (
    <header className="flex items-center h-10 px-3 border-b border-border bg-card gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-foreground tracking-wide">EXCHANGE SIM</span>
        <select value={symbol} onChange={e => setSymbol(e.target.value as typeof symbol)} className="h-6 px-2 text-[10px] bg-secondary border border-border rounded-sm text-foreground">
          {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="inline-flex items-center h-5 px-2 text-[9px] font-bold rounded-sm tracking-wider bg-muted text-muted-foreground">{sessionState}</span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {(['marketdata','trades','orders'] as const).map(stream => (
          <div key={stream} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Wifi className={`h-3 w-3 ${streamStatus[stream] === 'connected' ? 'text-buy' : 'text-warning'}`} />
            <span>{stream}: {streamStatus[stream] === 'connected' ? 'Connected' : 'Reconnecting'}</span>
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground">RTT <span className="text-foreground">{latency}ms</span></div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-1">
          <button onClick={handleStart} className="flex items-center justify-center h-6 w-6 rounded-sm bg-buy/20 text-buy"><Play className="h-3 w-3" /></button>
          <button onClick={handlePause} className="flex items-center justify-center h-6 w-6 rounded-sm bg-warning/20 text-warning"><Pause className="h-3 w-3" /></button>
          <button onClick={handleStop} className="flex items-center justify-center h-6 w-6 rounded-sm bg-sell/20 text-sell"><Square className="h-3 w-3" /></button>
        </div>
        <div className="flex items-center gap-1.5 w-24">
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{replaySpeed}x</span>
          <Slider
            value={sliderValue}
            onValueChange={handleSpeedChange}
            onValueCommit={handleSpeedCommit}
            min={0.25}
            max={10}
            step={0.25}
            className="w-full"
          />
        </div>
        <button onClick={() => setUserRole(userRole === 'TRADER' ? 'ADMIN' : 'TRADER')} className={`h-5 px-2 text-[9px] font-bold rounded-sm tracking-wider ${userRole === 'ADMIN' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}`}>{userRole}</button>
      </div>
    </header>
  )
}
