'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { TopBar } from './TopBar'
import { DomLadder } from './DomLadder'
import { OrderEntry } from './OrderEntry'
import { WorkingOrders, FillsTable } from './WorkingOrders'
import { TimeSales } from './TimeSales'
import { MicroStats } from './MicroStats'
import { BottomDock } from './BottomDock'
import { HotkeyHelp } from './HotkeyHelp'

export function AppShell() {
  const startEngine = useStore(s => s.startEngine)
  const stopEngine = useStore(s => s.stopEngine)
  const focusedIndex = useStore(s => s.focusedLadderIndex)
  const book = useStore(s => s.book)
  const symbol = useStore(s => s.symbol)

  useHotkeys()

  useEffect(() => {
    startEngine()
    return () => stopEngine()
  }, [startEngine, stopEngine])

  // Get focused price for indicator
  let focusedPrice: number | null = null
  if (focusedIndex !== null && book.bids.length > 0) {
    const allAsks = [...book.asks].slice(0, 20).reverse()
    const allBids = book.bids.slice(0, 20)
    const allLevels = [...allAsks, null, ...allBids]
    const level = allLevels[focusedIndex]
    if (level) focusedPrice = level.price
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Top Bar */}
      <TopBar />

      {/* Main 3-column area */}
      <div className="flex-1 grid grid-cols-[280px_1fr_260px] min-h-0 overflow-hidden">
        {/* Left Column: Order Entry + Blotter */}
        <div className="flex flex-col min-h-0 border-r border-border bg-card">
          <OrderEntry />
          <div className="flex-1 flex flex-col min-h-0">
            <WorkingOrders />
          </div>
          <div className="h-[200px] border-t border-border shrink-0">
            <FillsTable />
          </div>
        </div>

        {/* Center Column: DOM Ladder */}
        <div className="flex flex-col min-h-0 bg-background">
          {/* Focused price indicator */}
          {focusedPrice !== null && (
            <div className="flex items-center h-5 px-2 bg-primary/10 border-b border-primary/20 shrink-0">
              <span className="text-[10px] text-primary font-medium">
                FOCUSED: {focusedPrice.toFixed(2)} ({symbol})
              </span>
            </div>
          )}
          <DomLadder />
        </div>

        {/* Right Column: Tape + Stats */}
        <div className="flex flex-col min-h-0 border-l border-border bg-card">
          <div className="flex-1 min-h-0">
            <TimeSales />
          </div>
          <div className="border-t border-border shrink-0">
            <MicroStats />
          </div>
        </div>
      </div>

      {/* Bottom Dock */}
      <div className="h-[140px] shrink-0 relative">
        <BottomDock />
        {/* Hotkey help button */}
        <div className="absolute bottom-2 right-2">
          <HotkeyHelp />
        </div>
      </div>
    </div>
  )
}
