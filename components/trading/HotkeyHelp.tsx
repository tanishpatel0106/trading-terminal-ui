'use client'

import { useState } from 'react'
import { Keyboard } from 'lucide-react'

const HOTKEYS = [
  { key: 'B', desc: 'Buy Market' },
  { key: 'S', desc: 'Sell Market' },
  { key: 'Shift+B', desc: 'Buy Limit @ Best Bid' },
  { key: 'Shift+S', desc: 'Sell Limit @ Best Ask' },
  { key: 'C', desc: 'Cancel selected order' },
  { key: 'X', desc: 'Cancel all orders' },
  { key: 'Up/Down', desc: 'Move ladder focus' },
  { key: 'Enter', desc: 'Place at focused price' },
  { key: 'Esc', desc: 'Clear focus' },
]

export function HotkeyHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-6 w-6 rounded-sm bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        title="Keyboard Shortcuts"
      >
        <Keyboard className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-8 right-0 w-52 bg-card border border-border rounded-sm shadow-lg z-50 p-2">
          <div className="text-[10px] text-muted-foreground font-medium tracking-wider mb-1.5">KEYBOARD SHORTCUTS</div>
          {HOTKEYS.map(h => (
            <div key={h.key} className="flex items-center justify-between py-0.5">
              <kbd className="text-[9px] bg-secondary px-1.5 py-0.5 rounded-sm font-mono text-foreground">{h.key}</kbd>
              <span className="text-[10px] text-muted-foreground">{h.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
