'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export function useHotkeys() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      const store = useStore.getState()
      const { book, selectedQty, selectedTif, placeOrder, cancelAll, focusedLadderIndex, setFocusedLadderIndex } = store

      const bestBid = book.bids[0]?.price ?? 0
      const bestAsk = book.asks[0]?.price ?? 0

      switch (true) {
        // B: Buy Market
        case e.key === 'b' && !e.shiftKey && !e.altKey:
          e.preventDefault()
          placeOrder('BUY', 'MKT', bestAsk, selectedQty, selectedTif)
          break

        // S: Sell Market
        case e.key === 's' && !e.shiftKey && !e.altKey:
          e.preventDefault()
          placeOrder('SELL', 'MKT', bestBid, selectedQty, selectedTif)
          break

        // Shift+B: Buy Limit @ Best Bid
        case e.key === 'B' && e.shiftKey:
          e.preventDefault()
          placeOrder('BUY', 'LMT', bestBid, selectedQty, selectedTif)
          break

        // Shift+S: Sell Limit @ Best Ask
        case e.key === 'S' && e.shiftKey:
          e.preventDefault()
          placeOrder('SELL', 'LMT', bestAsk, selectedQty, selectedTif)
          break

        // C: Cancel selected
        case e.key === 'c' && !e.shiftKey:
          e.preventDefault()
          // Cancel the most recent active order
          const active = store.orders.find(o => o.status === 'LIVE' || o.status === 'PARTIAL')
          if (active) store.cancelOrderById(active.id)
          break

        // X: Cancel all
        case e.key === 'x' && !e.shiftKey:
          e.preventDefault()
          cancelAll()
          break

        // Arrow Up: move ladder focus up
        case e.key === 'ArrowUp':
          e.preventDefault()
          setFocusedLadderIndex(
            focusedLadderIndex === null ? 20 : Math.max(0, focusedLadderIndex - 1)
          )
          break

        // Arrow Down: move ladder focus down
        case e.key === 'ArrowDown':
          e.preventDefault()
          setFocusedLadderIndex(
            focusedLadderIndex === null ? 20 : Math.min(40, focusedLadderIndex + 1)
          )
          break

        // Enter: place limit at focused price
        case e.key === 'Enter':
          e.preventDefault()
          if (focusedLadderIndex !== null) {
            // Determine price from ladder index
            const allAsks = [...book.asks].slice(0, 20).reverse()
            const allBids = book.bids.slice(0, 20)
            const allLevels = [...allAsks, null, ...allBids] // null = spread
            const level = allLevels[focusedLadderIndex]
            if (level) {
              const side = store.selectedSide
              placeOrder(side, 'LMT', level.price, selectedQty, selectedTif)
            }
          }
          break

        // Esc: clear focus
        case e.key === 'Escape':
          e.preventDefault()
          setFocusedLadderIndex(null)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
