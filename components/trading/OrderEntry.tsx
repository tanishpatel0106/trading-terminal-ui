'use client'

import { useStore } from '@/lib/store'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCallback } from 'react'

const QTY_PRESETS = [10, 25, 50, 100, 250, 500]

export function OrderEntry() {
  const selectedSide = useStore(s => s.selectedSide)
  const selectedType = useStore(s => s.selectedType)
  const selectedTif = useStore(s => s.selectedTif)
  const selectedQty = useStore(s => s.selectedQty)
  const selectedPrice = useStore(s => s.selectedPrice)
  const symbol = useStore(s => s.symbol)
  const book = useStore(s => s.book)

  const setSelectedSide = useStore(s => s.setSelectedSide)
  const setSelectedType = useStore(s => s.setSelectedType)
  const setSelectedTif = useStore(s => s.setSelectedTif)
  const setSelectedQty = useStore(s => s.setSelectedQty)
  const setSelectedPrice = useStore(s => s.setSelectedPrice)
  const placeOrder = useStore(s => s.placeOrder)
  const cancelAll = useStore(s => s.cancelAll)

  const handleSubmit = useCallback(() => {
    const price = selectedType === 'MKT'
      ? (selectedSide === 'BUY' ? book.asks[0]?.price ?? 0 : book.bids[0]?.price ?? 0)
      : selectedPrice || (selectedSide === 'BUY' ? book.bids[0]?.price ?? 0 : book.asks[0]?.price ?? 0)
    placeOrder(selectedSide, selectedType, price, selectedQty, selectedTif)
  }, [selectedSide, selectedType, selectedTif, selectedQty, selectedPrice, placeOrder, book])

  const isBuy = selectedSide === 'BUY'

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-border">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium tracking-wider mb-0.5">
        <span>ORDER ENTRY</span>
        <span className="ml-auto">{symbol}</span>
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => setSelectedSide('BUY')}
          className={`h-7 text-[11px] font-semibold rounded-sm transition-colors ${
            isBuy
              ? 'bg-buy text-background'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setSelectedSide('SELL')}
          className={`h-7 text-[11px] font-semibold rounded-sm transition-colors ${
            !isBuy
              ? 'bg-sell text-background'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Type */}
      <div className="grid grid-cols-2 gap-1">
        {(['LMT', 'MKT'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`h-6 text-[10px] font-medium rounded-sm transition-colors ${
              selectedType === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Qty */}
      <div>
        <label className="text-[10px] text-muted-foreground">QTY</label>
        <Input
          type="number"
          value={selectedQty}
          onChange={e => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
          className="h-7 text-[11px] bg-secondary border-border"
        />
        <div className="flex gap-1 mt-1 flex-wrap">
          {QTY_PRESETS.map(q => (
            <button
              key={q}
              onClick={() => setSelectedQty(q)}
              className={`h-5 px-1.5 text-[9px] rounded-sm font-medium transition-colors ${
                selectedQty === q
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="text-[10px] text-muted-foreground">PRICE</label>
        <Input
          type="number"
          step="0.01"
          value={selectedPrice || ''}
          onChange={e => setSelectedPrice(parseFloat(e.target.value) || 0)}
          disabled={selectedType === 'MKT'}
          placeholder={selectedType === 'MKT' ? 'MKT' : formatPrice(book.mid, symbol)}
          className="h-7 text-[11px] bg-secondary border-border disabled:opacity-50"
        />
      </div>

      {/* TIF */}
      <div className="grid grid-cols-3 gap-1">
        {(['DAY', 'IOC', 'FOK'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSelectedTif(t)}
            className={`h-5 text-[9px] font-medium rounded-sm transition-colors ${
              selectedTif === t
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        className={`h-8 text-[11px] font-semibold ${
          isBuy
            ? 'bg-buy hover:bg-buy/90 text-background'
            : 'bg-sell hover:bg-sell/90 text-background'
        }`}
      >
        {isBuy ? 'BUY' : 'SELL'} {selectedQty} {symbol}
      </Button>

      {/* Cancel All */}
      <Button
        onClick={cancelAll}
        variant="outline"
        className="h-6 text-[10px] text-muted-foreground border-border hover:text-foreground hover:bg-destructive/10"
      >
        CANCEL ALL
      </Button>
    </div>
  )
}
