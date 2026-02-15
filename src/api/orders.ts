import { request } from './client'

export const placeOrder = (sessionId: string, payload: {
  user_id: string
  type: 'LIMIT' | 'MARKET'
  side: 'B' | 'S'
  qty: number
  price?: number
  tif?: 'DAY' | 'IOC' | 'FOK'
}) => request<{ order_id: string; status: string }>(`/sessions/${sessionId}/orders`, {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const cancelOrder = (sessionId: string, orderId: string) => request(`/sessions/${sessionId}/orders/${orderId}/cancel`, { method: 'POST' })
export const modifyOrder = (sessionId: string, orderId: string, payload: { price?: number; qty?: number }) => request(`/sessions/${sessionId}/orders/${orderId}/modify`, { method: 'POST', body: JSON.stringify(payload) })
export const listOrders = (sessionId: string, userId: string, limit = 200) => request<any[]>(`/sessions/${sessionId}/orders?user_id=${encodeURIComponent(userId)}&limit=${limit}`)
