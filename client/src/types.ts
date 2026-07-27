export interface InterpretationDetail {
  coreMeaning: string
  love: string
  career: string
  finance: string
  health: string
  advice: string
}

export type SpreadPosition = 'past' | 'present' | 'future'

export interface TarotCard {
  id: number
  nameCn: string
  nameEn: string
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  number?: string
  keywords: string[]
  meaningUp: string
  meaningDown: string
  description: string
  imageUrl: string
  interpretation: {
    up: InterpretationDetail
    down: InterpretationDetail
  }
}

export interface DrawnCard extends TarotCard {
  position: 'up' | 'down'
  meaning: string
  spreadPosition?: SpreadPosition
}

export interface Reading {
  id: number
  questionType: string
  question: string
  spreadType: string
  cards: DrawnCard[]
  createdAt: string
  readingResult?: string
  readingSource?: 'ai' | 'template'
  userId?: number
  isPublic?: boolean
}

export interface ReadingRequest {
  questionType: string
  question: string
  spreadType: 'single' | 'three-card'
}

export interface LocalReading {
  id: string
  questionType: string
  question: string
  spreadType: string
  cards: DrawnCard[]
  createdAt: string
  readingResult?: string
  readingSource?: 'ai' | 'template'
}

export const SPREAD_LABELS: Record<string, string[]> = {
  'three-card': ['过去', '现在', '未来'],
}

// Auth types
export interface User {
  id: number
  email?: string
  phone?: string
  displayName?: string
  avatarUrl?: string
  authProvider: string
  role: 'free' | 'premium' | 'admin'
  createdAt: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginRequest {
  account: string
  password: string
}

export interface RegisterRequest {
  email?: string
  phone?: string
  password: string
  displayName?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}
