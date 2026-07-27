import { useEffect, useState } from 'react'
import allCards from '../data/cards.json'
import type { TarotCard } from '../types'

interface Props {
  onComplete: () => void
}

const SHUFFLE_DURATION = 1500
const NAME_INTERVAL = 60

const shuffleAnimNames = ['shuffle-0', 'shuffle-1', 'shuffle-2']

export default function ShufflePage({ onComplete }: Props) {
  const [cardIndex, setCardIndex] = useState(0)
  const allNames = (allCards as TarotCard[]).map(c => c.nameCn)

  useEffect(() => {
    const nameInterval = setInterval(() => {
      setCardIndex(prev => (prev + 1) % allNames.length)
    }, NAME_INTERVAL)

    const completeTimer = setTimeout(() => {
      onComplete()
    }, SHUFFLE_DURATION)

    return () => {
      clearInterval(nameInterval)
      clearTimeout(completeTimer)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-serif text-mystic-gold mb-2">洗牌中</h2>
      <p className="text-mystic-text/40 text-sm mb-8 animate-pulse">✦ 集中精神，感受牌的能量 ✦</p>

      <div className="relative w-56 h-64 flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="absolute w-36 h-52 bg-gradient-to-br from-mystic-card to-purple-900 rounded-lg
              border border-mystic-gold/30 flex items-center justify-center"
            style={{
              animationName: shuffleAnimNames[i],
              animationDuration: '1.8s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 0.05}s`,
              zIndex: 3 - i,
            }}
          >
            <div className="absolute top-2 left-2 text-mystic-gold/30 text-[8px]">✦</div>
            <div className="absolute top-2 right-2 text-mystic-gold/30 text-[8px]">✦</div>
            <div className="absolute bottom-2 left-2 text-mystic-gold/30 text-[8px]">✦</div>
            <div className="absolute bottom-2 right-2 text-mystic-gold/30 text-[8px]">✦</div>

            <div className="text-center">
              <div className="text-mystic-gold text-2xl mb-2">★</div>
              <div className="w-24 h-28 mx-auto border border-mystic-gold/30 rounded flex items-center justify-center">
                <span className="text-mystic-gold/80 text-base font-serif text-center px-1 leading-tight">
                  {allNames[cardIndex % allNames.length]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
