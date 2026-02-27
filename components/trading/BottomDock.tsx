'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { formatTime } from '@/lib/format'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'

function formatReplayTime(secondsAfterMidnight: number): string {
  if (!secondsAfterMidnight) return '--:--:--'
  const hours = Math.floor(secondsAfterMidnight / 3600)
  const minutes = Math.floor((secondsAfterMidnight % 3600) / 60)
  const seconds = Math.floor(secondsAfterMidnight % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function LogsPanel() {
  const logs = useStore(s => s.logs)

  return (
    <div className="flex-1 overflow-auto min-h-0 p-1">
      {logs.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground/50">
          No log events
        </div>
      ) : (
        logs.slice(0, 100).map(log => (
          <div key={log.id} className="flex items-center gap-2 h-4 text-[10px] px-1">
            <span className="text-muted-foreground w-16 shrink-0">{formatTime(log.ts)}</span>
            <span className={`w-10 shrink-0 font-medium text-[9px] ${
              log.type === 'FILL' ? 'text-buy' :
              log.type === 'REJECT' ? 'text-sell' :
              log.type === 'CANCEL' ? 'text-warning' :
              log.type === 'ORDER' ? 'text-primary' :
              'text-muted-foreground'
            }`}>
              {log.type}
            </span>
            <span className="text-foreground/80 truncate">{log.message}</span>
          </div>
        ))
      )}
    </div>
  )
}

function ReplayPanel() {
  const replayProgress = useStore(s => s.replayProgress)
  const fetchProgress = useStore(s => s.fetchProgress)
  const sessionId = useStore(s => s.sessionId)

  useEffect(() => {
    if (!sessionId) return
    fetchProgress()
    const id = setInterval(fetchProgress, 2000)
    return () => clearInterval(id)
  }, [sessionId, fetchProgress])

  if (!replayProgress) {
    return (
      <div className="p-2 flex items-center justify-center h-full text-[10px] text-muted-foreground/50">
        No replay session active
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground tracking-wider w-16">PROGRESS</span>
        <div className="flex-1">
          <Progress value={replayProgress.progress_pct} className="h-2" />
        </div>
        <span className="text-[10px] text-foreground font-medium w-12 text-right">
          {replayProgress.progress_pct.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">EVENTS</span>
          <span className="text-[11px] font-medium text-foreground">
            {replayProgress.events_processed.toLocaleString()} / {replayProgress.total_events.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">MARKET TIME</span>
          <span className="text-[11px] font-medium text-foreground">
            {formatReplayTime(replayProgress.current_time)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">SPEED</span>
          <span className="text-[11px] font-medium text-primary">
            {replayProgress.speed}x
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">STATUS</span>
          <span className={`text-[11px] font-medium ${
            replayProgress.is_running ? 'text-buy' :
            replayProgress.is_stopped ? 'text-sell' :
            'text-warning'
          }`}>
            {replayProgress.is_running ? 'PLAYING' : replayProgress.is_stopped ? 'STOPPED' : 'PAUSED'}
          </span>
        </div>
      </div>
    </div>
  )
}

function SettingsPanel() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)

  return (
    <div className="p-2 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground tracking-wider w-20">LADDER LEVELS</span>
        <span className="text-[10px] text-foreground w-8">{settings.ladderLevels}</span>
        <Slider
          value={[settings.ladderLevels]}
          onValueChange={([v]) => updateSettings({ ladderLevels: v })}
          min={10} max={50} step={5}
          className="w-32"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground tracking-wider w-20">UPDATE (ms)</span>
        <span className="text-[10px] text-foreground w-8">{settings.updateSpeed}</span>
        <Slider
          value={[settings.updateSpeed]}
          onValueChange={([v]) => updateSettings({ updateSpeed: v })}
          min={50} max={500} step={25}
          className="w-32"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground tracking-wider w-20">DENSITY</span>
        <div className="flex gap-1">
          {(['compact', 'comfy'] as const).map(d => (
            <button
              key={d}
              onClick={() => updateSettings({ density: d })}
              className={`h-5 px-2 text-[9px] font-medium rounded-sm transition-colors ${
                settings.density === d
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BottomDock() {
  const dockTab = useStore(s => s.dockTab)
  const setDockTab = useStore(s => s.setDockTab)
  const tabs = ['logs', 'replay', 'settings'] as const

  return (
    <div className="flex flex-col h-full border-t border-border bg-card">
      {/* Tab bar */}
      <div className="flex items-center h-6 border-b border-border bg-secondary/30 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setDockTab(tab)}
            className={`h-full px-3 text-[10px] font-medium tracking-wider transition-colors ${
              dockTab === tab
                ? 'text-foreground border-b border-primary bg-card'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Panel content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {dockTab === 'logs' && <LogsPanel />}
        {dockTab === 'replay' && <ReplayPanel />}
        {dockTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}
