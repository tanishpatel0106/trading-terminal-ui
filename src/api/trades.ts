import { request } from './client'

export const fetchRecentTrades = (sessionId: string, limit = 200) => request<any[]>(`/sessions/${sessionId}/trades?limit=${limit}`)
