import { request } from './client'
import type { MarketDataSnapshot } from './contracts'

export const fetchSnapshot = async (sessionId: string, levels = 20): Promise<MarketDataSnapshot> => {
  const response = await request<{ bids: any[]; asks: any[] }>(`/sessions/${sessionId}/book?levels=${levels}`)
  return { event: 'snapshot', bids: response.bids, asks: response.asks, ts: Date.now() }
}
