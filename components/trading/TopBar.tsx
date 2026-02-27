'use client'

import { useStore } from '@/lib/store'
import { Play, Pause, Square, Wifi, RotateCcw } from 'lucide-react'
import { pauseSession, setReplaySpeed, startSession, stopSession } from '@/src/api/sessions'

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20, 30, 40, 50, 100] as const

export function TopBar() {
  const symbol = useStore(s => s.symbol)
  const sessionState = useStore(s => s.sessionState)
  const replaySpeed = useStore(s => s.replaySpeed)
  const sessionId = useStore(s => s.sessionId)
  const streamStatus = useStore(s => s.streamStatus)
  const replayProgress = useStore(s => s.replayProgress)

  const setReplaySpeedState = useStore(s => s.setReplaySpeed)
  const setSessionState = useStore(s => s.setSessionState)

  const handleStart = async () => {
    if (!sessionId) return
    await startSession(sessionId)
    setSessionState('REPLAY')
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

  const handleNewSession = () => {
    localStorage.removeItem('tt.session_id')
    window.location.reload()
  }

  const setSpeed = async (v: number) => {
    setReplaySpeedState(v)
    if (sessionId) await setReplaySpeed(sessionId, v)
  }

  return (
    <header className="flex items-center h-10 px-3 border-b border-border bg-card gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-foreground tracking-wide">REPLAY TERMINAL</span>

        <span className="text-[11px] font-medium text-primary">{symbol}</span>

        <span className={`inline-flex items-center h-5 px-2 text-[9px] font-bold rounded-sm tracking-wider ${
          sessionState === 'REPLAY'
            ? 'bg-buy/20 text-buy'
            : sessionState === 'PAUSED'
            ? 'bg-warning/20 text-warning'
            : 'bg-muted text-muted-foreground'
        }`}>
          {sessionState === 'REPLAY' ? 'PLAYING' : sessionState}
        </span>

        {replayProgress && (
          <span className="text-[10px] text-muted-foreground">
            {replayProgress.progress_pct.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {(['marketdata', 'trades'] as const).map(stream => (
          <div key={stream} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Wifi className={`h-3 w-3 ${streamStatus[stream] === 'connected' ? 'text-buy' : 'text-warning'}`} />
            <span>
              {stream}: {streamStatus[stream] === 'connected' ? 'OK' : '...'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={handleStart}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-buy/20 text-buy hover:bg-buy/30"
            title="Play"
          >
            <Play className="h-3 w-3" />
          </button>

          <button
            onClick={handlePause}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-warning/20 text-warning hover:bg-warning/30"
            title="Pause"
          >
            <Pause className="h-3 w-3" />
          </button>

          <button
            onClick={handleStop}
            className="flex items-center justify-center h-6 w-6 rounded-sm bg-sell/20 text-sell hover:bg-sell/30"
            title="Stop"
          >
            <Square className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`h-6 px-1.5 text-[9px] font-bold rounded-sm tracking-wider border border-border ${
                replaySpeed === s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}X
            </button>
          ))}
        </div>

        <button
          onClick={handleNewSession}
          className="flex items-center gap-1 h-6 px-2 text-[9px] font-medium rounded-sm bg-secondary text-muted-foreground hover:text-foreground border border-border"
          title="New replay session"
        >
          <RotateCcw className="h-3 w-3" />
          NEW
        </button>
      </div>
    </header>
  )
}
