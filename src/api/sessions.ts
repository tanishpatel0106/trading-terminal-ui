import { request } from './client'
import type { SessionMode } from './contracts'

export interface SessionRead {
  id: string
  mode: SessionMode
  symbol: string
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  replay_speed: number
}

export const createSession = (mode: SessionMode, symbol: string) => request<{ session_id: string }>('/sessions', {
  method: 'POST',
  body: JSON.stringify({ mode, symbol }),
})

export const getSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}`)
export const startSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/start`, { method: 'POST' })
export const pauseSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/pause`, { method: 'POST' })
export const stopSession = (sessionId: string) => request<SessionRead>(`/sessions/${sessionId}/stop`, { method: 'POST' })
export const setReplaySpeed = (sessionId: string, speed: number) => request<SessionRead>(`/sessions/${sessionId}/replay/speed`, {
  method: 'POST', body: JSON.stringify({ speed }),
})
