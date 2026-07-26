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
}

export const SPREAD_LABELS: Record<string, string[]> = {
  'three-card': ['过去', '现在', '未来'],
}
