import { request } from './client'

export interface StockInfo {
  ticker: string
  date: string
  total_events: number
}

export interface SessionRead {
  id: string
  mode: string
  symbol: string
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  replay_speed: number
}

export interface ReplayProgress {
  events_processed: number
  total_events: number
  progress_pct: number
  current_time: number
  start_time: number
  end_time: number
  is_running: boolean
  is_stopped: boolean
  speed: number
}

export const listStocks = () => request<StockInfo[]>('/sessions/stocks')
export const createSession = (symbol: string) => request<{ session_id: string }>('/sessions', {
  method: 'POST',
  body: JSON.stringify({ mode: 'HISTORICAL_REPLAY', symbol }),
})
export const getSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}`)
export const startSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/start`, { method: 'POST' })
export const pauseSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/pause`, { method: 'POST' })
export const stopSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/stop`, { method: 'POST' })
export const setReplaySpeed = (sessionId: string, speed: number) => request<SessionRead>(`/sessions/${sessionId}/replay/speed`, {
  method: 'POST', body: JSON.stringify({ speed }),
})
export const getReplayProgress = (sessionId: string) => request<ReplayProgress>(`/sessions/${sessionId}/replay/progress`)
