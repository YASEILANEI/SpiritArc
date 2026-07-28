import type { User } from '../types'

interface Props {
  onStart: () => void
  onHistory: () => void
  user: User | null
}

export default function HomePage({ onStart, onHistory, user }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20">
      {/* Beta notice */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-yellow-900/30 backdrop-blur-sm border-b border-yellow-700/30 text-center py-1.5">
        <p className="text-yellow-400/70 text-xs tracking-wide">
          ⚡ Beta 测试阶段 · 数据可能在升级后重置
        </p>
      </div>

      <div className="mb-8 text-center">
        <div className="text-mystic-gold text-6xl mb-4">✧</div>
        <h1 className="text-3xl md:text-5xl font-serif text-mystic-gold mb-2">牌灵占卜</h1>
        <p className="text-mystic-text/60 text-sm">探寻内心的答案</p>
      </div>

      {/* Card back decoration */}
      <div className="relative w-32 h-48 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-mystic-card to-purple-900 rounded-lg border border-mystic-gold/30 shadow-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="text-mystic-gold text-3xl mb-1">★</div>
            <div className="w-16 h-24 mx-auto border border-mystic-gold/40 rounded flex items-center justify-center">
              <span className="text-mystic-gold/60 text-xs">TAROT</span>
            </div>
          </div>
        </div>
        <div className="absolute -inset-1 bg-mystic-gold/10 rounded-lg blur-sm -z-10" />
      </div>

      <button
        onClick={onStart}
        className="px-8 py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif text-lg
          hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20"
      >
        开始占卜
      </button>

      <button
        onClick={onHistory}
        className="mt-4 text-mystic-text/50 text-sm hover:text-mystic-gold transition-colors"
      >
        查看历史记录
      </button>
    </div>
  )
}
