import { useEffect, useState } from 'react'
import allCards from '../data/cards.json'
import type { TarotCard } from '../types'

interface Props {
  onComplete: () => void
}

export default function ShufflePage({ onComplete }: Props) {
  const [cardIndex, setCardIndex] = useState(0)
  const allNames = (allCards as TarotCard[]).map(c => c.nameCn)

  useEffect(() => {
    const interval = setInterval(() => {
      setCardIndex(prev => (prev + 1) % allNames.length)
    }, 80)

    const timer = setTimeout(() => {
      clearInterval(interval)
      onComplete()
    }, 2500)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-serif text-mystic-gold mb-8">正在洗牌...</h2>

      <div className="relative w-40 h-56">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="absolute inset-0 bg-gradient-to-br from-mystic-card to-purple-900 rounded-lg
              border border-mystic-gold/30 shadow-2xl flex items-center justify-center
              animate-shuffle"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.3s',
              zIndex: 3 - i,
              transform: `rotate(${(i - 1) * 3}deg)`,
            }}
          >
            <div className="text-center">
              <div className="text-mystic-gold text-2xl mb-1">★</div>
              <div className="w-20 h-28 mx-auto border border-mystic-gold/30 rounded flex items-center justify-center">
                <span className="text-mystic-gold/80 text-lg font-serif">{allNames[cardIndex % allNames.length]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-mystic-text/40 text-sm">集中精神，感受牌的能量...</p>
    </div>
  )
}
