'use client'

import { useStore } from '@/lib/store'
import { formatTime, formatPnl, formatPrice } from '@/lib/format'
import { Slider } from '@/components/ui/slider'

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

function RiskPanel() {
  const position = useStore(s => s.position)
  const symbol = useStore(s => s.symbol)

  return (
    <div className="p-2">
      <div className="grid grid-cols-5 gap-3">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">SYMBOL</span>
          <span className="text-[11px] font-medium text-foreground">{position.symbol}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">POSITION</span>
          <span className={`text-[11px] font-medium ${position.qty > 0 ? 'text-buy' : position.qty < 0 ? 'text-sell' : 'text-foreground'}`}>
            {position.qty > 0 ? '+' : ''}{position.qty}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">AVG PX</span>
          <span className="text-[11px] font-medium text-foreground">
            {position.avgPx > 0 ? formatPrice(position.avgPx, symbol) : '--'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">REALIZED</span>
          <span className={`text-[11px] font-medium ${position.realizedPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
            {formatPnl(position.realizedPnl)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground tracking-wider">UNREALIZED</span>
          <span className={`text-[11px] font-medium ${position.unrealizedPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
            {formatPnl(position.unrealizedPnl)}
          </span>
        </div>
      </div>
    </div>
  )
}

function ReplayPanel() {
  return (
    <div className="p-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground tracking-wider">TIMELINE</span>
        <div className="flex-1">
          <Slider defaultValue={[50]} min={0} max={100} step={1} className="w-full" />
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">
        Replay controls are available when session is in REPLAY mode.
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
  const tabs = ['logs', 'risk', 'replay', 'settings'] as const

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
        {dockTab === 'risk' && <RiskPanel />}
        {dockTab === 'replay' && <ReplayPanel />}
        {dockTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}
