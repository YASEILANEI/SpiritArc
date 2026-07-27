import { useMemo, useState, useEffect } from 'react'
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

function sectionStyle(title: string) {
  if (title === '重点摘要') {
    return {
      cardClass: 'bg-gradient-to-br from-mystic-gold/15 to-mystic-card/90 rounded-xl p-5 border border-mystic-gold/40 border-l-4',
      headerClass: 'text-mystic-gold font-serif text-xl tracking-wide [text-shadow:0_0_12px_rgba(201,168,76,0.3)]',
    }
  }
  return {
    cardClass: 'bg-mystic-card/90 rounded-xl p-5 border border-mystic-gold/30 border-l-4',
    headerClass: 'text-mystic-gold font-serif text-xl tracking-wide [text-shadow:0_0_12px_rgba(201,168,76,0.3)]',
  }
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-mystic-gold font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function ReadingResultPage({ reading, onBackToResult, onHome }: Props) {
  const [result, setResult] = useState(reading.readingResult)
  const isServerReading = typeof reading.id === 'number'
  const isLoading = isServerReading && !result

  // Poll for AI result when not yet available
  useEffect(() => {
    if (!isServerReading || reading.readingResult) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/readings/${reading.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.readingResult) {
          setResult(data.readingResult)
        }
      } catch { /* ignore */ }
    }, 2000)
    return () => clearInterval(poll)
  }, [])

  const sections = useMemo(
    () => result
      ? parseSections(result)
      : [],
    [result, reading.cards]
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
        {result ? (
          <div className="space-y-6">
            {sections.map((section, i) => {
              const style = sectionStyle(section.title)
              const paragraphs = section.content.split('\n').filter(l => l.trim())
              return (
              <div key={i}>
                <div
                  className={`${style.cardClass} animate-fadeIn`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <h3 className={style.headerClass}>
                    <span className="inline-block mr-2 text-mystic-gold/60">✦</span>
                    {section.title}
                  </h3>
                  <div className="w-8 h-0.5 bg-mystic-gold/40 mt-2 mb-4 rounded-full" />

                  <div className="text-mystic-text/70 leading-relaxed text-sm space-y-3">
                    {paragraphs.map((line, j) => (
                      <p key={j}>{renderBold(line.trim())}</p>
                    ))}
                  </div>
                </div>

                {/* Decorative divider before 牌阵综合 */}
                {i === 0 && isThreeCard && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent" />
                    <span className="text-mystic-gold/30 text-xs">✦</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent" />
                  </div>
                )}

                {/* Three-card spread summary - between 重点摘要 and 具体分析 */}
                {i === 0 && isThreeCard && (
                  <div className="bg-mystic-card/90 rounded-xl p-5 border border-mystic-gold/30 border-l-4 animate-fadeIn mt-5">
                    <h3 className="text-mystic-gold font-serif text-xl tracking-wide
                      [text-shadow:0_0_12px_rgba(201,168,76,0.3)]">
                      <span className="inline-block mr-2 text-mystic-gold/60">✦</span>
                      牌阵综合
                    </h3>
                    <div className="w-8 h-0.5 bg-mystic-gold/40 mt-2 mb-4 rounded-full" />
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

                {/* Decorative divider between sections */}
                {i < sections.length - 1 && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent" />
                    <span className="text-mystic-gold/30 text-xs">✦</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent" />
                  </div>
                )}
              </div>
              )
            })}
          </div>
        ) : isLoading ? (
          <div className="bg-mystic-card/80 rounded-xl p-8 text-center border border-mystic-gold/20">
            <div className="w-12 h-12 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-mystic-text/40">解读生成中...</p>
            <p className="text-mystic-text/30 text-xs mt-2">牌灵正在为你书写指引</p>
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
