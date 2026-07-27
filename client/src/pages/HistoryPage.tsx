import { useEffect, useState } from 'react'
import type { Reading, LocalReading } from '../types'
import { SPREAD_LABELS } from '../types'
import { fetchReadings } from '../api'

interface Props {
  onBack: () => void
  onSelect: (reading: Reading | LocalReading) => void
  onSelectResult: (reading: Reading | LocalReading) => void
}

export default function HistoryPage({ onBack, onSelect }: Props) {
  const [readings, setReadings] = useState<(Reading | LocalReading)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReadings().then(data => {
      setReadings(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-mystic-text/50 hover:text-mystic-gold transition-colors"
          >
            ← 返回
          </button>
          <h2 className="text-2xl font-serif text-mystic-gold">占卜记录</h2>
          <div className="w-12" />
        </div>
      </div>

      {loading ? (
        <p className="text-mystic-text/40 text-center py-10">加载中...</p>
      ) : readings.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-mystic-text/40 mb-4">还没有占卜记录</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-mystic-gold text-mystic-bg rounded-full text-sm"
          >
            开始第一次占卜
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-w-md mx-auto">
          {readings.map(r => {
            const card = r.cards[0]
            const date = new Date(r.createdAt).toLocaleString('zh-CN', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
            const spreadLabel = r.spreadType === 'three-card' ? '三张牌' : '单张牌'
            return (
              <button
                key={'id' in r ? r.id : r.id}
                onClick={() => onSelect(r)}
                className="w-full text-left bg-mystic-card/60 rounded-xl p-4 border border-mystic-gold/10
                  hover:border-mystic-gold/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 bg-gradient-to-br from-mystic-card to-purple-800 rounded-lg
                    border border-mystic-gold/30 flex items-center justify-center flex-shrink-0 relative"
                  >
                    <span className="text-mystic-gold text-xs">
                      {card?.position === 'down' ? '⬇' : '⬆'}
                    </span>
                    {r.cards.length > 1 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-mystic-gold text-mystic-bg
                        rounded-full text-xs flex items-center justify-center font-bold"
                      >
                        {r.cards.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-mystic-gold font-serif truncate">
                        {r.cards.map(c => c.nameCn).join(' · ')}
                      </span>
                      {r.readingResult && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectResult(r) }}
                          className="text-xs text-mystic-gold/50 hover:text-mystic-gold whitespace-nowrap ml-auto"
                        >
                          查看解读
                        </button>
                      )}
                    </div>
                    {r.question && (
                      <p className="text-mystic-text/50 text-sm truncate">{r.question}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-mystic-text/30">{spreadLabel}</span>
                      <span className="text-xs text-mystic-text/30">{date}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
