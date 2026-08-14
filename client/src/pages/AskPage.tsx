import { useState } from 'react'
import BackButton from '../components/BackButton'

interface Props {
  onDraw: (questionType: string, question: string, spreadType: 'single' | 'three-card') => void
  onBack: () => void
}

const questionTypes = [
  { value: 'general', label: '综合指引' },
  { value: 'love', label: '感情' },
  { value: 'career', label: '事业' },
  { value: 'health', label: '健康' },
  { value: 'finance', label: '财运' },
]

export default function AskPage({ onDraw, onBack }: Props) {
  const [questionType, setQuestionType] = useState('general')
  const [spreadType, setSpreadType] = useState<'single' | 'three-card'>('single')
  const [question, setQuestion] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <BackButton onClick={onBack} className="absolute top-4 left-4" />

      <div className="w-full max-w-md">
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-8">
          请静下心来，思考你的问题
        </h2>

        {/* Question type selector */}
        <div className="mb-6">
          <label className="block text-mystic-text/60 text-sm mb-2">问题类别</label>
          <div className="flex flex-wrap gap-2">
            {questionTypes.map(qt => (
              <button
                key={qt.value}
                onClick={() => setQuestionType(qt.value)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  questionType === qt.value
                    ? 'bg-mystic-gold text-mystic-bg'
                    : 'bg-mystic-card text-mystic-text/60 hover:text-mystic-gold'
                }`}
              >
                {qt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spread type selector */}
        <div className="mb-6">
          <label className="block text-mystic-text/60 text-sm mb-2">牌阵选择</label>
          <div className="flex gap-3">
            <button
              onClick={() => setSpreadType('single')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm transition-all ${
                spreadType === 'single'
                  ? 'bg-mystic-gold text-mystic-bg ring-2 ring-mystic-gold/50'
                  : 'bg-mystic-card text-mystic-text/60 hover:text-mystic-gold border border-mystic-gold/10'
              }`}
            >
              <div className="font-serif mb-1">单张牌</div>
              <div className="text-xs opacity-60">快速指引</div>
            </button>
            <button
              onClick={() => setSpreadType('three-card')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm transition-all ${
                spreadType === 'three-card'
                  ? 'bg-mystic-gold text-mystic-bg ring-2 ring-mystic-gold/50'
                  : 'bg-mystic-card text-mystic-text/60 hover:text-mystic-gold border border-mystic-gold/10'
              }`}
            >
              <div className="font-serif mb-1">三张牌</div>
              <div className="text-xs opacity-60">过去 · 现在 · 未来</div>
            </button>
          </div>
        </div>

        {/* Question input */}
        <div className="mb-8">
          <label className="block text-mystic-text/60 text-sm mb-2">
            你的问题 <span className="text-mystic-text/30">（选填）</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="例如：我今天需要注意什么？"
            className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
              text-mystic-text placeholder:text-mystic-text/30
              focus:outline-none focus:border-mystic-gold/50 transition-colors"
          />
        </div>

        <button
          onClick={() => onDraw(questionType, question, spreadType)}
          className="w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif text-lg
            hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20"
        >
          洗牌 · 抽牌
        </button>
      </div>
    </div>
  )
}
