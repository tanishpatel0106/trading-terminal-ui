'use client'

import { useCallback, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useMarketDataStream, useOrderUpdatesStream, useTradesStream } from '@/src/api/ws'
import { TopBar } from './TopBar'
import { DomLadder } from './DomLadder'
import { OrderEntry } from './OrderEntry'
import { WorkingOrders, FillsTable } from './WorkingOrders'
import { TimeSales } from './TimeSales'
import { MicroStats } from './MicroStats'
import { BottomDock } from './BottomDock'
import { HotkeyHelp } from './HotkeyHelp'
import { SessionConnectModal } from './SessionConnectModal'

export function AppShell() {
  const focusedIndex = useStore(s => s.focusedLadderIndex)
  const book = useStore(s => s.book)
  const symbol = useStore(s => s.symbol)
  const sessionId = useStore(s => s.sessionId)
  const userId = useStore(s => s.userId)

  const connectSession = useStore(s => s.connectSession)
  const updateFromMarketData = useStore(s => s.updateFromMarketData)
  const updateFromTrade = useStore(s => s.updateFromTrade)
  const updateFromOrderUpdate = useStore(s => s.updateFromOrderUpdate)

  const setStreamStatus = useStore(s => s.setStreamStatus)
  const resyncSnapshot = useStore(s => s.resyncSnapshot)
  const streamStatus = useStore(s => s.streamStatus)

  useHotkeys()

  useEffect(() => {
    const savedSession = localStorage.getItem('tt.session_id')
    const savedUser = localStorage.getItem('tt.user_id')
    if (savedUser) useStore.getState().setUserId(savedUser)
    if (savedSession) connectSession(savedSession)
  }, [connectSession])

  const onResync = useCallback(() => {
    resyncSnapshot()
  }, [resyncSnapshot])

  // ✅ NEW: stable status callbacks so ws hooks don't retrigger every render
  const onMarketStatus = useCallback(
    (s: any) => setStreamStatus('marketdata', s),
    [setStreamStatus]
  )
  const onTradesStatus = useCallback(
    (s: any) => setStreamStatus('trades', s),
    [setStreamStatus]
  )
  const onOrdersStatus = useCallback(
    (s: any) => setStreamStatus('orders', s),
    [setStreamStatus]
  )

  useMarketDataStream(sessionId, updateFromMarketData, onMarketStatus, onResync)
  useTradesStream(sessionId, updateFromTrade as any, onTradesStatus)
  useOrderUpdatesStream(sessionId, userId, updateFromOrderUpdate, onOrdersStatus)

  let focusedPrice: number | null = null
  if (focusedIndex !== null && book.bids.length > 0) {
    const allAsks = [...book.asks].slice(0, 20).reverse()
    const allBids = book.bids.slice(0, 20)
    const allLevels = [...allAsks, null, ...allBids]
    const level = allLevels[focusedIndex]
    if (level) focusedPrice = level.price
  }

  const reconnecting = Object.values(streamStatus).some(v => v !== 'connected')

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {!sessionId && <SessionConnectModal />}
      {reconnecting && sessionId && (
        <div className="h-7 text-xs bg-warning/20 text-warning px-3 flex items-center">
          Reconnecting…
        </div>
      )}

      <TopBar />

      <div className="flex-1 grid grid-cols-[280px_1fr_260px] min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 border-r border-border bg-card">
          <OrderEntry />
          <div className="flex-1 flex flex-col min-h-0">
            <WorkingOrders />
          </div>
          <div className="h-[200px] border-t border-border shrink-0">
            <FillsTable />
          </div>
        </div>

        <div className="flex flex-col min-h-0 bg-background">
          {focusedPrice !== null && (
            <div className="flex items-center h-5 px-2 bg-primary/10 border-b border-primary/20 shrink-0">
              <span className="text-[10px] text-primary font-medium">
                FOCUSED: {focusedPrice.toFixed(2)} ({symbol})
              </span>
            </div>
          )}
          <DomLadder />
        </div>

        <div className="flex flex-col min-h-0 border-l border-border bg-card">
          <div className="flex-1 min-h-0">
            <TimeSales />
          </div>
          <div className="border-t border-border shrink-0">
            <MicroStats />
          </div>
        </div>
      </div>

      <div className="h-[140px] shrink-0 relative">
        <BottomDock />
        <div className="absolute bottom-2 right-2">
          <HotkeyHelp />
        </div>
      </div>
    </div>
  )
}
