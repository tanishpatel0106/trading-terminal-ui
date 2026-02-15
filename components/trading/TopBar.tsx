'use client'

import { useStore } from '@/lib/store'
import { SYMBOLS } from '@/lib/engine/models'
import { Play, Pause, Square, Wifi } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

export function TopBar() {
  const symbol = useStore(s => s.symbol)
  const sessionState = useStore(s => s.sessionState)
  const replaySpeed = useStore(s => s.replaySpeed)
  const userRole = useStore(s => s.userRole)
  const latency = useStore(s => s.latency)

  const setSymbol = useStore(s => s.setSymbol)
  const setReplaySpeed = useStore(s => s.setReplaySpeed)
  const setUserRole = useStore(s => s.setUserRole)
  const startEngine = useStore(s => s.startEngine)
  const stopEngine = useStore(s => s.stopEngine)
  const setSessionState = useStore(s => s.setSessionState)

  const handleStart = () => startEngine()
  const handlePause = () => {
    if (sessionState === 'LIVE') {
      setSessionState('PAUSED')
    } else if (sessionState === 'PAUSED') {
      setSessionState('LIVE')
    }
  }
  const handleStop = () => stopEngine()

  return (
    <header className="flex items-center h-10 px-3 border-b border-border bg-card gap-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-foreground tracking-wide">EXCHANGE SIM</span>

        {/* Symbol selector */}
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value as typeof symbol)}
          className="h-6 px-2 text-[10px] bg-secondary border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SYMBOLS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Session state pill */}
        <span className={`inline-flex items-center h-5 px-2 text-[9px] font-bold rounded-sm tracking-wider ${
          sessionState === 'LIVE' ? 'bg-buy/20 text-buy' :
          sessionState === 'REPLAY' ? 'bg-primary/20 text-primary' :
          'bg-muted text-muted-foreground'
        }`}>
          {sessionState}
        </span>
      </div>

      {/* Center */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Wifi className="h-3 w-3 text-buy" />
          <span>WS: Connected</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          RTT <span className="text-foreground">{latency}ms</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleStart}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-buy/20 text-buy hover:bg-buy/30 transition-colors"
            title="Start"
          >
            <Play className="h-3 w-3" />
          </button>
          <button
            onClick={handlePause}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-warning/20 text-warning hover:bg-warning/30 transition-colors"
            title="Pause/Resume"
          >
            <Pause className="h-3 w-3" />
          </button>
          <button
            onClick={handleStop}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-sell/20 text-sell hover:bg-sell/30 transition-colors"
            title="Stop"
          >
            <Square className="h-3 w-3" />
          </button>
        </div>

        {/* Replay speed */}
        <div className="flex items-center gap-1.5 w-24">
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{replaySpeed}x</span>
          <Slider
            value={[replaySpeed]}
            onValueChange={([v]) => setReplaySpeed(v)}
            min={0.25}
            max={10}
            step={0.25}
            disabled={sessionState === 'LIVE'}
            className="w-full"
          />
        </div>

        {/* User role */}
        <button
          onClick={() => setUserRole(userRole === 'TRADER' ? 'ADMIN' : 'TRADER')}
          className={`h-5 px-2 text-[9px] font-bold rounded-sm tracking-wider transition-colors ${
            userRole === 'ADMIN' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'
          }`}
        >
          {userRole}
        </button>
      </div>
    </header>
  )
}
