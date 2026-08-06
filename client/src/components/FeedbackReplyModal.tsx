import { useState } from 'react'
import type { FeedbackReply } from '../types'

interface Props {
  replies: FeedbackReply[]
  onClose: () => void
  onRead: () => void
  onViewReading?: (readingId: number) => void
}

export default function FeedbackReplyModal({ replies, onClose, onRead, onViewReading }: Props) {
  const [viewing, setViewing] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-mystic-card border border-mystic-gold/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn max-h-[80vh] overflow-y-auto">
        {!viewing ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl text-mystic-gold/70 mb-3">✦</div>
              <h3 className="text-mystic-gold font-serif text-xl mb-2">开发者有回复了</h3>
              <p className="text-mystic-text/40 text-sm">
                你有 {replies.length} 条反馈收到了回复
              </p>
            </div>
            <button
              onClick={() => setViewing(true)}
              className="w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif
                hover:bg-yellow-500 transition-all mb-2"
            >
              查看回复
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-mystic-text/40 text-sm hover:text-mystic-text/60 transition-colors pt-2"
            >
              稍后再说
            </button>
          </>
        ) : (
          <>
            <h3 className="text-mystic-gold font-serif text-lg text-center mb-4">你的反馈与回复</h3>
            <div className="space-y-4">
              {replies.map(r => (
                <div key={r.id} className="bg-mystic-bg/60 rounded-xl p-4 border border-mystic-gold/15">
                  <div className="text-mystic-text/40 text-xs mb-1">
                    你的反馈（{new Date(r.createdAt).toLocaleString('zh-CN')}）
                  </div>
                  <p className="text-mystic-text/80 text-sm whitespace-pre-wrap break-words">{r.content}</p>
                  <div className="mt-3 p-3 bg-mystic-gold/10 border border-mystic-gold/20 rounded-lg">
                    <div className="text-mystic-gold/80 text-xs mb-1">开发者回复</div>
                    <p className="text-mystic-text/80 text-sm whitespace-pre-wrap break-words">{r.reply}</p>
                  </div>
                  {r.readingId && onViewReading && (
                    <button
                      onClick={() => onViewReading(r.readingId!)}
                      className="mt-2 text-xs text-mystic-gold/80 hover:underline"
                    >
                      查看关联占卜记录 →
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onRead}
              className="mt-5 w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif
                hover:bg-yellow-500 transition-all"
            >
              知道了
            </button>
          </>
        )}
      </div>
    </div>
  )
}
