import { apiFetch } from './api'
import type { Reading, LocalReading } from './types'

const SESSION_KEY = 'tarot_current_reading'
const LOCAL_KEY = 'tarot_readings'

export function saveCurrentReading(reading: Reading | LocalReading): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(reading))
  } catch { /* ignore */ }
}

export function loadCurrentReading(): Reading | LocalReading | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearCurrentReading(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch { /* ignore */ }
}

function getLocalReadings(): LocalReading[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

// Restore a reading by id: local_ ids live in localStorage, server ids are fetched by API.
export async function fetchReadingById(id: string): Promise<Reading | LocalReading | null> {
  if (id.startsWith('local_')) {
    return getLocalReadings().find(r => r.id === id) ?? null
  }
  try {
    const res = await apiFetch(`/readings/${id}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
