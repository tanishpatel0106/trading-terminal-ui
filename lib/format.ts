export function formatPrice(price: number, symbol: string): string {
  if (symbol === 'BTC-USD') {
    return price.toFixed(2)
  }
  return price.toFixed(2)
}

export function formatSize(size: number): string {
  if (size >= 1000) return `${(size / 1000).toFixed(1)}k`
  return String(size)
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

export function formatTimeShort(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)}`
}

export function orderAge(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 1000) return '<1s'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  return `${Math.floor(diff / 3600000)}h`
}


export function formatPriceFromTicks(priceTicks: number, tickSize: number): string {
  return (priceTicks * tickSize).toFixed(2)
}
