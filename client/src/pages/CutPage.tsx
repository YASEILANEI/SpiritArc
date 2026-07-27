import { useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function CutPage({ onComplete }: Props) {
  const [phase, setPhase] = useState<'idle' | 'lifting' | 'done'>('idle')

  const handleCut = () => {
    if (phase !== 'idle') return
    setPhase('lifting')
    setTimeout(() => setPhase('done'), 600)
    setTimeout(onComplete, 1200)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-serif text-mystic-gold mb-2">请切牌</h2>
      <p className="text-mystic-text/40 text-sm mb-10">点击牌堆完成切牌</p>

      {/* Card deck */}
      <div
        className="relative w-40 h-56 cursor-pointer select-none"
        onClick={handleCut}
      >
        {/* Bottom cards (deck base) */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-mystic-card to-purple-900"
          style={{
            border: '1px solid rgba(201,168,76,0.15)',
            transform: 'rotate(1deg) translateY(4px)',
            zIndex: 1,
          }}
        />
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-mystic-card to-purple-900"
          style={{
            border: '1px solid rgba(201,168,76,0.2)',
            transform: 'rotate(-0.5deg) translateY(2px)',
            zIndex: 2,
          }}
        />

        {/* Top card (moves during cut) */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-mystic-card to-purple-900 flex items-center justify-center"
          style={{
            border: '1.5px solid rgba(201,168,76,0.5)',
            zIndex: phase === 'lifting' ? 20 : 10,
            transform: phase === 'lifting'
              ? 'translateY(-80px) rotate(-3deg) scale(1.05)'
              : phase === 'done'
              ? 'translateY(40px) rotate(2deg) scale(0.95)'
              : 'translateY(0) rotate(0deg)',
            boxShadow: phase === 'lifting'
              ? '0 20px 40px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.1)'
              : '0 4px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Tarot card back design */}
          <div className="text-center">
            <div className="text-mystic-gold/50 text-xs tracking-widest mb-2">TAROT</div>
            <div className="w-16 h-20 mx-auto rounded border border-mystic-gold/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-mystic-gold/60 text-xl mb-1">★</div>
                <div className="text-mystic-gold/20 text-[8px] tracking-wider">MYSTIC</div>
              </div>
            </div>
            <div className="text-mystic-gold/50 text-xs tracking-widest mt-2">★ ★ ★</div>
          </div>
        </div>

        {/* Glow */}
        {phase !== 'idle' && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              boxShadow: '0 0 50px rgba(201,168,76,0.2)',
              zIndex: 25,
            }}
          />
        )}
      </div>

      {phase === 'idle' && (
        <p className="mt-10 text-mystic-text/40 text-sm">点击上方牌堆切牌</p>
      )}

      {phase !== 'idle' && (
        <p className="mt-10 text-mystic-text/40 text-sm animate-pulse">
          {phase === 'lifting' && '抬起牌堆...'}
          {phase === 'done' && '切牌完成 ✦'}
        </p>
      )}
    </div>
  )
}
