import { useMemo } from 'react'
import type { Reading, LocalReading } from '../types'

interface Props {
  reading: Reading | LocalReading
  onBackToResult: () => void
  onHome: () => void
}

interface Section {
  title: string
  content: string
}

const spreadPositionLabels: Record<string, string> = {
  past: '过去',
  present: '现在',
  future: '未来',
}

function parseSections(text: string): Section[] {
  const parts = text.split(/^###\s+/m).filter(Boolean)
  return parts.map(part => {
    const firstNewline = part.indexOf('\n')
    if (firstNewline === -1) return { title: part.trim(), content: '' }
    return {
      title: part.slice(0, firstNewline).trim(),
      content: part.slice(firstNewline + 1).trim(),
    }
  }).filter(s => s.title || s.content)
}

export default function ReadingResultPage({ reading, onBackToResult, onHome }: Props) {
  const sections = useMemo(
    () => reading.readingResult ? parseSections(reading.readingResult) : [],
    [reading.readingResult]
  )
  const isOffline = reading.readingSource === 'template'
  const hasQuestion = !!reading.question?.trim()
  const isThreeCard = reading.cards.length === 3

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBackToResult}
            className="text-mystic-text/50 hover:text-mystic-gold transition-colors"
          >
            ← 返回翻牌
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-mystic-text/40 bg-mystic-card px-2 py-1 rounded">
              {isThreeCard ? '三张牌阵' : '单张牌'}
            </span>
            {isOffline && (
              <span className="text-xs text-mystic-text/30 bg-mystic-card px-2 py-1 rounded">
                离线模式
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        {reading.question && (
          <div className="text-center mb-6">
            <p className="text-mystic-text/40 text-xs mb-1">你的问题</p>
            <p className="text-mystic-text/80 text-base">"{reading.question}"</p>
          </div>
        )}

        {/* Empty question hint */}
        {!hasQuestion && (
          <div className="text-center mb-6">
            <p className="text-mystic-text/40 text-xs bg-mystic-card/40 rounded-lg py-2 px-4 inline-block">
              未提供具体问题，解读为一般性指引
            </p>
          </div>
        )}

        {/* Reading content */}
        {reading.readingResult ? (
          <div className="space-y-5">
            {sections.map((section, i) => (
              <div key={i}>
                <div
                  className="bg-mystic-card/80 rounded-xl p-5 border border-mystic-gold/20 animate-fadeIn"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <h3 className="text-mystic-gold font-serif text-lg mb-3 tracking-wide
                    [text-shadow:0_0_12px_rgba(201,168,76,0.3)]"
                  >
                    {section.title}
                  </h3>
                  <div className="text-mystic-text/70 leading-relaxed text-sm space-y-3 whitespace-pre-wrap">
                    {section.content.split('\n').filter(l => l.trim()).map((line, j) => (
                      <p key={j}>{line.trim()}</p>
                    ))}
                  </div>
                </div>

                {/* Three-card spread summary - between 整体状况 and 具体分析 */}
                {i === 0 && isThreeCard && (
                  <div className="bg-mystic-card/80 rounded-xl p-5 border border-mystic-gold/20 animate-fadeIn mt-5">
                    <h3 className="text-mystic-gold font-serif text-lg mb-3 tracking-wide
                      [text-shadow:0_0_12px_rgba(201,168,76,0.3)]">
                      牌阵综合
                    </h3>
                    <div className="space-y-4">
                      {reading.cards.map((card, j) => {
                        const label = spreadPositionLabels[card.spreadPosition || ''] || `第${j + 1}张`
                        const pos = card.position === 'down' ? '逆位' : '正位'
                        const meaning = card.interpretation?.[card.position]?.coreMeaning || card.meaning
                        return (
                          <div key={j}>
                            <h4 className="text-mystic-gold font-serif text-sm mb-1">
                              {label} — {card.nameCn}（{pos}）
                            </h4>
                            <p className="text-mystic-text/70 text-sm leading-relaxed">{meaning}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-mystic-card/80 rounded-xl p-8 text-center border border-mystic-gold/20">
            <p className="text-mystic-text/40">解读暂不可用</p>
            <p className="text-mystic-text/30 text-xs mt-2">请稍后重试或返回重新占卜</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onHome}
            className="flex-1 py-3 bg-mystic-gold/10 text-mystic-gold rounded-full
              border border-mystic-gold/30 hover:bg-mystic-gold/20 transition-all text-sm"
          >
            再占一次
          </button>
          <button
            onClick={onBackToResult}
            className="flex-1 py-3 bg-mystic-gold text-mystic-bg rounded-full
              hover:bg-yellow-500 transition-all text-sm font-serif"
          >
            返回翻牌结果
          </button>
        </div>
      </div>
    </div>
  )
}
