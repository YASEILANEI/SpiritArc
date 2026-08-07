import type { TarotCard, DrawnCard, Reading, ReadingRequest, LocalReading } from './types'
import allCards from './data/cards.json'
import { generateLocalReading } from './utils/reading-generator'

const API_BASE = '/api'

// Token management (set by AuthContext on init/refresh)
let _accessToken: string | null = null
let _onAuthExpired: (() => void) | null = null

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export function setOnAuthExpired(cb: () => void) {
  _onAuthExpired = cb
}

// Fetch wrapper with automatic auth header + 401 refresh interceptor
let _refreshPromise: Promise<{ accessToken: string } | null> | null = null

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (_accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`)
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Token expired — try refresh (with mutex for concurrent 401s)
  if (res.status === 401 && _accessToken) {
    try {
      if (!_refreshPromise) {
        _refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        }).then(r => r.ok ? r.json() : null).finally(() => { _refreshPromise = null })
      }
      const data = await _refreshPromise
      if (data) {
        _accessToken = data.accessToken
        headers.set('Authorization', `Bearer ${_accessToken}`)
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        })
      } else {
        _accessToken = null
        _onAuthExpired?.()
      }
    } catch {
      _accessToken = null
      _onAuthExpired?.()
    }
  }

  return res
}

// Migrate local readings to cloud after login/register
export async function migrateLocalReadings(): Promise<void> {
  try {
    const raw = localStorage.getItem('tarot_readings')
    if (!raw) return
    const local = JSON.parse(raw)
    if (!Array.isArray(local) || local.length === 0) return

    const res = await apiFetch('/readings/batch-sync', {
      method: 'POST',
      body: JSON.stringify({ readings: local }),
    })
    if (res.ok) {
      localStorage.removeItem('tarot_readings')
    }
  } catch { /* ignore */ }
}

const SPREAD_POSITIONS: Record<string, string[]> = {
  'three-card': ['past', 'present', 'future'],
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function drawLocal(count: number, spreadType?: string): DrawnCard[] {
  const cards = allCards as TarotCard[]
  return shuffleArray(cards).slice(0, count).map((c, i) => {
    const position = Math.random() < 0.5 ? 'up' as const : 'down' as const
    return {
      ...c,
      position,
      meaning: position === 'up' ? c.meaningUp : c.meaningDown,
      spreadPosition: SPREAD_POSITIONS[spreadType || '']?.[i] as DrawnCard['spreadPosition'],
    }
  })
}

function getLocalReadings(): LocalReading[] {
  try {
    return JSON.parse(localStorage.getItem('tarot_readings') || '[]')
  } catch {
    return []
  }
}

function saveLocalReading(reading: LocalReading) {
  const readings = getLocalReadings()
  readings.unshift(reading)
  localStorage.setItem('tarot_readings', JSON.stringify(readings.slice(0, 50)))
}

export async function createReading(req: ReadingRequest): Promise<Reading | LocalReading> {
  try {
    const res = await apiFetch('/readings', {
      method: 'POST',
      body: JSON.stringify(req),
    })
    if (!res.ok) {
      // Server rejected the request — surface the error, don't silent-fallback
      const err = await res.json().catch(() => ({ error: '占卜创建失败' }))
      throw new Error(err.error || '占卜创建失败')
    }
    const reading: Reading = await res.json()
    return reading
  } catch (err) {
    // Only fall back to offline on network errors, not server rejections
    if (err instanceof Error && err.message !== '占卜创建失败' && !err.message.includes('API error')) {
      // Network error — offline fallback
      const count = req.spreadType === 'three-card' ? 3 : 1
      const drawn = drawLocal(count, req.spreadType)
      const localReading = generateLocalReading(req.questionType, req.question, drawn)
      const local: LocalReading = {
        id: `local_${Date.now()}`,
        ...req,
        cards: drawn,
        createdAt: new Date().toISOString(),
        readingResult: localReading.result,
        readingSource: localReading.source,
      }
      saveLocalReading(local)
      return local
    }
    throw err
  }
}

// Upgrade a template reading to AI (牌灵解读)
export async function upgradeReading(id: number): Promise<Reading> {
  const res = await apiFetch(`/readings/${id}/ai-reading`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '升级失败' }))
    throw new Error(err.error || '升级失败')
  }
  return res.json()
}

export async function fetchReadings(): Promise<(Reading | LocalReading)[]> {
  const local = getLocalReadings()
  try {
    const res = await apiFetch('/readings')
    if (!res.ok) throw new Error('API error')
    const remote: Reading[] = await res.json()
    return [...remote, ...local]
  } catch {
    return local
  }
}

export interface ChatMessage {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  userRating?: 'up' | 'down' | null
}

export interface ChatConversation {
  id: number
  readingId: number
  question: string
  questionType: string
  spreadType: string
  cards: DrawnCard[]
  readingResult?: string | null
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export async function createChatConversation(readingId: number): Promise<ChatConversation> {
  const res = await apiFetch('/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ readingId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '聊天会话创建失败' }))
    throw new Error(err.error || '聊天会话创建失败')
  }
  return res.json()
}

export async function sendChatMessage(conversationId: number, content: string): Promise<{
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  quota: { limit: number; used: number; remaining: number } | null
}> {
  const res = await apiFetch(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '发送消息失败' }))
    throw new Error(err.error || '发送消息失败')
  }
  return res.json()
}

export async function deleteChatConversation(conversationId: number): Promise<void> {
  const res = await apiFetch(`/chat/conversations/${conversationId}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '删除聊天失败' }))
    throw new Error(err.error || '删除聊天失败')
  }
}

export async function setMessageFeedback(messageId: number, rating: 'up' | 'down' | null): Promise<void> {
  const res = await apiFetch(`/chat/messages/${messageId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '评价失败' }))
    throw new Error(err.error || '评价失败')
  }
}

export { allCards, apiFetch }
export type { TarotCard }