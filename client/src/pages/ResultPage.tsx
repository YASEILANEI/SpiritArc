import { useState } from 'react'
import type { DrawnCard, Reading, LocalReading } from '../types'
import { SPREAD_LABELS } from '../types'

interface Props {
  reading: Reading | LocalReading
  onBack: () => void
  onHome: () => void
  onShowReadingResult: () => void
}

const questionContextMap: Record<string, string> = {
  love: '在感情方面',
  career: '在事业方面',
  finance: '在财运方面',
  health: '在健康方面',
  general: '综合来看',
}

const spreadPositionLabels: Record<string, string> = {
  past: '过去',
  present: '现在',
  future: '未来',
}

export default function ResultPage({ reading, onBack, onHome, onShowReadingResult }: Props) {
  const [flippedStates, setFlippedStates] = useState<boolean[]>(
    new Array(reading.cards.length).fill(false)
  )
  const allFlipped = flippedStates.every(Boolean)
  const isThreeCard = reading.cards.length === 3
  const isLocal = 'id' in reading && typeof reading.id === 'string' && reading.id.startsWith('local_')

  const handleFlip = (index: number) => {
    if (flippedStates[index]) return
    const next = [...flippedStates]
    next[index] = true
    setFlippedStates(next)
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors">
            ← 返回
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-mystic-text/40 bg-mystic-card px-2 py-1 rounded">
              {isThreeCard ? '三张牌阵' : '单张牌'}
            </span>
            {isLocal && (
              <span className="text-xs text-mystic-text/30 bg-mystic-card px-2 py-1 rounded">离线</span>
            )}
          </div>
        </div>

        {/* Question */}
        {reading.question && (
          <div className="text-center mb-6">
            <p className="text-mystic-text/40 text-xs mb-1">你的问题</p>
            <p className="text-mystic-text/80 text-lg">"{reading.question}"</p>
          </div>
        )}

        {/* Cards section */}
        <div className={`flex justify-center items-end gap-0 ${isThreeCard ? 'h-72' : 'h-64'} mb-4`}>
          {reading.cards.map((card, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Spread position label */}
              {isThreeCard && card.spreadPosition && (
                <span className="text-xs text-mystic-gold/70 mb-2 font-serif">
                  {spreadPositionLabels[card.spreadPosition] || card.spreadPosition}
                </span>
              )}

              {/* Card */}
              <div
                className={`perspective w-32 h-52 cursor-pointer transition-all duration-500
                  ${isThreeCard ? getFanStyle(i, flippedStates[i]) : ''}
                  ${!flippedStates[i] ? 'hover:scale-105' : ''}`}
                onClick={() => handleFlip(i)}
              >
                <div className={`card-inner relative w-full h-full ${flippedStates[i] ? 'flipped' : ''}`}>
                  {/* Back face */}
                  <div className="card-back bg-gradient-to-br from-mystic-card to-purple-900 rounded-xl
                    border-2 border-mystic-gold/30 shadow-xl flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="text-mystic-gold text-2xl mb-1">★</div>
                      {!flippedStates[i] && (
                        <div className="text-mystic-gold/40 text-xs animate-pulse">点击翻牌</div>
                      )}
                    </div>
                  </div>

                  {/* Front face */}
                  <div className="card-front bg-gradient-to-br from-mystic-card to-purple-800 rounded-xl
                    border-2 border-mystic-gold/60 shadow-xl overflow-hidden"
                  >
                    <div className="h-32 flex items-center justify-center bg-mystic-bg/50">
                      <div className="text-center p-2">
                        <div className="text-2xl text-mystic-gold/60 mb-1">
                          {card.position === 'down' ? '⬇' : '⬆'}
                        </div>
                        <div className="text-mystic-gold font-serif text-sm leading-tight">{card.nameCn}</div>
                        <div className="text-mystic-text/40 text-[10px] mt-0.5">{card.nameEn}</div>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          card.position === 'down' ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                        }`}>
                          {card.position === 'down' ? '逆位' : '正位'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interpretation sections - show for each flipped card */}
        {reading.cards.map((card, i) => (
          flippedStates[i] && (
            <div key={i} className="animate-fadeIn mb-4">
              {isThreeCard && card.spreadPosition && (
                <h3 className="text-mystic-gold font-serif text-base mb-2">
                  {spreadPositionLabels[card.spreadPosition] || card.spreadPosition} — {card.nameCn}
                  <span className={`text-xs ml-2 ${card.position === 'down' ? 'text-red-400' : 'text-green-400'}`}>
                    {card.position === 'down' ? '逆位' : '正位'}
                  </span>
                </h3>
              )}

              {card.interpretation ? (
                <div className="bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20 space-y-3">
                  <InterpretSection title="核心含义" text={card.interpretation[card.position]?.coreMeaning} />

                  {(reading.questionType === 'general' || reading.questionType === 'love') && (
                    <InterpretSection title={`${questionContextMap.love}`} text={card.interpretation[card.position]?.love} />
                  )}
                  {(reading.questionType === 'general' || reading.questionType === 'career') && (
                    <InterpretSection title={`${questionContextMap.career}`} text={card.interpretation[card.position]?.career} />
                  )}
                  {(reading.questionType === 'general' || reading.questionType === 'finance') && (
                    <InterpretSection title={`${questionContextMap.finance}`} text={card.interpretation[card.position]?.finance} />
                  )}
                  {(reading.questionType === 'general' || reading.questionType === 'health') && (
                    <InterpretSection title={`${questionContextMap.health}`} text={card.interpretation[card.position]?.health} />
                  )}

                  <InterpretSection title="行动建议" text={card.interpretation[card.position]?.advice} />
                </div>
              ) : (
                <div className="bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20">
                  <p className="text-mystic-text/80 leading-relaxed text-sm">{card.meaning}</p>
                </div>
              )}
            </div>
          )
        ))}

        {/* Action buttons */}
        {allFlipped && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={onHome}
              className="flex-1 py-3 bg-mystic-gold/10 text-mystic-gold rounded-full
                border border-mystic-gold/30 hover:bg-mystic-gold/20 transition-all text-sm"
            >
              再占一次
            </button>
            {reading.readingResult && (
              <button
                onClick={onShowReadingResult}
                className="flex-1 py-3 bg-mystic-gold text-mystic-bg rounded-full
                  hover:bg-yellow-500 transition-all text-sm font-serif"
              >
                查看完整解读
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InterpretSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h4 className="text-mystic-gold/80 font-serif text-sm mb-1">{title}</h4>
      <p className="text-mystic-text/70 leading-relaxed text-sm">{text}</p>
    </div>
  )
}

function getFanStyle(index: number, flipped: boolean): string {
  if (flipped) return ''
  const rotations = ['-rotate-6', 'rotate-0', 'rotate-6']
  const zIndices = ['z-0', 'z-10', 'z-0']
  const translates = ['-translate-x-4', 'translate-x-0', 'translate-x-4']
  return `${rotations[index]} ${zIndices[index]} ${translates[index]}`
}
