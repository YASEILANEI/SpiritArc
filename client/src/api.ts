import type { TarotCard, DrawnCard, Reading, ReadingRequest, LocalReading } from './types'
import allCards from './data/cards.json'

const API_BASE = '/api'

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

function drawLocal(count: number, spreadType?: string): DrawnCard[] {
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
    const res = await fetch(`${API_BASE}/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error('API error')
    const reading: Reading = await res.json()
    return reading
  } catch {
    // Offline fallback
    const count = req.spreadType === 'three-card' ? 3 : 1
    const local: LocalReading = {
      id: `local_${Date.now()}`,
      ...req,
      cards: drawLocal(count, req.spreadType),
      createdAt: new Date().toISOString(),
    }
    saveLocalReading(local)
    return local
  }
}

export async function fetchReadings(): Promise<(Reading | LocalReading)[]> {
  const local = getLocalReadings()
  try {
    const res = await fetch(`${API_BASE}/readings`)
    if (!res.ok) throw new Error('API error')
    const remote: Reading[] = await res.json()
    return [...remote, ...local]
  } catch {
    return local
  }
}

export { allCards }
export type { TarotCard }
