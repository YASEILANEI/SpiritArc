import { useState, useEffect } from 'react'

interface Props {
  cards?: any[]
  spreadType: string
  onComplete: () => void
}

const COLS = 13
const TOTAL = 78

const spreadPositionLabels: Record<string, string> = {
  past: '过去',
  present: '现在',
  future: '未来',
}

export default function DrawPage({ cards, spreadType, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [floating, setFloating] = useState<number | null>(null)
  const isThreeCard = spreadType === 'three-card'
  const totalToDraw = isThreeCard ? 3 : 1
  const allDrawn = selected.size >= totalToDraw

  useEffect(() => {
    if (allDrawn) {
      const timer = setTimeout(onComplete, 800)
      return () => clearTimeout(timer)
    }
  }, [allDrawn])

  const handleSelect = (idx: number) => {
    if (selected.has(idx) || allDrawn || floating !== null) return
    setFloating(idx)
    setTimeout(() => {
      setSelected(prev => new Set(prev).add(idx))
      setFloating(null)
    }, 400)
  }

  const positions = Array.from({ length: TOTAL }, (_, i) => ({
    row: Math.floor(i / COLS),
    col: i % COLS,
    idx: i,
  }))

  if (!cards) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin mb-6" />
        <h2 className="text-lg font-serif text-mystic-gold mb-2">牌灵回应中</h2>
        <p className="text-mystic-text/40 text-sm">请稍候，牌灵正在回应你的问题...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6">
      <h2 className="text-xl font-serif text-mystic-gold mb-1">
        {allDrawn ? '抽牌完成' : '请从牌阵中选牌'}
      </h2>
      <p className="text-mystic-text/40 text-sm mb-4">
        {allDrawn
          ? '答案即将揭晓...'
          : `点击桌上的牌，选取${totalToDraw}张 —— 已选 ${selected.size}`
        }
      </p>

      {/* Table */}
      <div
        className="w-full max-w-lg rounded-2xl p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,46,0.5) 0%, rgba(10,10,26,0.7) 100%)',
          border: '1px solid rgba(201,168,76,0.08)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="grid gap-[1px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {positions.map(({ idx }) => {
            const isSelected = selected.has(idx)
            const isFloating = floating === idx
            const clickable = !isSelected && !allDrawn && floating === null
            const isLastRow = idx >= TOTAL - COLS

            return (
              <div
                key={idx}
                className={`rounded-sm transition-all duration-400 select-none
                  ${clickable ? 'cursor-pointer' : ''}
                `}
                style={{
                  aspectRatio: '5 / 7',
                  background: 'linear-gradient(135deg, #1a1a2e, #2d1b69)',
                  border: isSelected || isFloating
                    ? '1px solid rgba(201,168,76,0.6)'
                    : '1px solid rgba(201,168,76,0.1)',
                  transform: isFloating
                    ? 'translateY(-36px) scale(1.2)'
                    : isSelected
                    ? 'translateY(-14px) scale(1.06)'
                    : 'scale(1)',
                  boxShadow: isFloating
                    ? '0 16px 48px rgba(201,168,76,0.4), 0 0 80px rgba(201,168,76,0.15)'
                    : isSelected
                    ? '0 4px 16px rgba(201,168,76,0.15)'
                    : 'none',
                  zIndex: isFloating ? 50 : isSelected ? 30 : 1,
                  opacity: isFloating ? 1 : isSelected ? 1 : 0.85,
                  marginBottom: isLastRow ? 0 : undefined,
                }}
                onClick={() => clickable && handleSelect(idx)}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[7px] text-mystic-gold/30">★</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected labels */}
      {!allDrawn && selected.size > 0 && (
        <div className="mt-4 flex gap-3">
          {Array.from(selected).sort().map((_, i) => (
            <span key={i} className="text-mystic-gold/60 text-xs font-serif">
              {isThreeCard ? (spreadPositionLabels[['past','present','future'][i]] || `第${i+1}张`) : '你的牌'} ✓
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
