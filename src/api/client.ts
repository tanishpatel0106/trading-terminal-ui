const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  // vite compatibility
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'http://localhost:8000'

export class ApiError extends Error {
  constructor(message: string, public status: number, public payload: unknown) {
    super(message)
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError((payload as any)?.detail || response.statusText, response.status, payload)
  }
  return payload as T
}

export function wsUrl(path: string): string {
  const base = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')
  return `${base}${path}`
}
