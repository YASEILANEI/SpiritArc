import { useState, useEffect } from 'react'
import PageContainer from '../components/PageContainer'
import { apiFetch } from '../api'
import type { Feedback, ReadingOption } from '../types'

interface Props {
  onBack: () => void
}

export default function FeedbackPage({ onBack }: Props) {
  const [content, setContent] = useState('')
  const [readingId, setReadingId] = useState('')
  const [options, setOptions] = useState<ReadingOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)

  useEffect(() => {
    apiFetch('/readings/options')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setOptions(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiFetch('/feedback')
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setMyFeedback(data) })
      .catch(() => {})
      .finally(() => setFeedbackLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), readingId: readingId || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '提交失败' }))
        throw new Error(err.error || '提交失败')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5.5rem)] text-center">
          <div className="text-5xl text-mystic-gold/60 mb-6">✉</div>
          <h2 className="text-2xl font-serif text-mystic-gold mb-4">感谢你的反馈</h2>
          <p className="text-mystic-text/60 text-sm leading-relaxed max-w-sm mx-auto mb-8">
            你的反馈已送达，我们会认真查看。感谢你帮助我们做得更好。
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif text-sm
              hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20"
          >
            返回首页
          </button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="pt-8 pb-6 text-center">
        <div className="text-5xl text-mystic-gold/60 mb-6">✉</div>
        <h2 className="text-2xl font-serif text-mystic-gold mb-4">意见反馈</h2>
        <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-4 rounded-full" />
        <p className="text-mystic-text/40 text-sm mb-2">
          遇到问题或有什么建议，欢迎告诉我们
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-mystic-text/60 text-sm mb-1">问题内容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="请描述你遇到的问题或想提的建议..."
            required
            rows={6}
            maxLength={2000}
            className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
              text-mystic-text placeholder:text-mystic-text/30 resize-none
              focus:outline-none focus:border-mystic-gold/50 transition-colors"
          />
          <p className="text-right text-mystic-text/30 text-xs mt-1">{content.length} / 2000</p>
        </div>

        <div>
          <label className="block text-mystic-text/60 text-sm mb-1">关联占卜记录（可选）</label>
          <select
            value={readingId}
            onChange={e => setReadingId(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
              text-mystic-text focus:outline-none focus:border-mystic-gold/50 transition-colors
              disabled:opacity-50"
          >
            <option value="">不关联占卜记录</option>
            {options.map(o => (
              <option key={o.id} value={String(o.id)}>
                #{o.seq ?? o.id} {o.question ? o.question.slice(0, 20) : '(未填写问题)'} · {new Date(o.createdAt).toLocaleDateString('zh-CN')}
              </option>
            ))}
          </select>
          <p className="text-mystic-text/30 text-xs mt-1">如果是针对某次占卜的问题，可以选择对应的记录</p>
        </div>

        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif
            hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20
            disabled:opacity-50"
        >
          {submitting ? '提交中...' : '提交反馈'}
        </button>
      </form>

      {/* My feedback history */}
      <div className="mt-10">
        <h3 className="text-mystic-gold font-serif text-lg mb-4">我的反馈</h3>
        {feedbackLoading ? (
          <p className="text-mystic-text/40 text-sm py-6 text-center">加载中...</p>
        ) : myFeedback.length === 0 ? (
          <p className="text-mystic-text/40 text-sm py-6 text-center">还没有提交过反馈</p>
        ) : (
          <div className="space-y-3">
            {myFeedback.map(f => (
              <div key={f.id} className="bg-mystic-card/60 rounded-xl p-4 border border-mystic-gold/10">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    f.status === 'processed'
                      ? 'text-green-400/80 border-green-500/30'
                      : 'text-mystic-gold border-mystic-gold/30'
                  }`}>
                    {f.status === 'processed' ? '已处理' : '未处理'}
                  </span>
                  <span className="text-mystic-text/30 text-xs">
                    {new Date(f.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-mystic-text/80 text-sm whitespace-pre-wrap break-words">{f.content}</p>
                {f.readingId && (
                  <p className="text-mystic-text/40 text-xs mt-2">
                    关联占卜：{f.readingQuestion || '(记录已删除)'}
                  </p>
                )}
                {f.reply && (
                  <div className="mt-3 p-3 bg-mystic-gold/10 border border-mystic-gold/20 rounded-lg">
                    <div className="text-mystic-gold/80 text-xs mb-1">开发者回复</div>
                    <p className="text-mystic-text/80 text-sm whitespace-pre-wrap break-words">{f.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
