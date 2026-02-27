'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export function useHotkeys() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      const store = useStore.getState()
      const { focusedLadderIndex, setFocusedLadderIndex } = store

      switch (true) {
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
