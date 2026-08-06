import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import type { Feedback } from '../types'

interface Props {
  onBack: () => void
}

type StatusFilter = 'all' | 'open' | 'processed'

const STATUS_LABELS: Record<string, string> = {
  open: '未处理',
  processed: '已处理',
}

export default function AdminFeedbackPage({ onBack }: Props) {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  const fetchFeedback = (p: number, status: StatusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (status !== 'all') params.set('status', status)
    apiFetch(`/admin/feedback?${params}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setFeedback(data.feedback)
          setTotalPages(data.pagination.totalPages)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeedback(page, statusFilter) }, [page, statusFilter])

  const handleFilter = (status: StatusFilter) => {
    setStatusFilter(status)
    setPage(1)
  }

  const handleStatusChange = async (id: number, status: string) => {
    const res = await apiFetch(`/admin/feedback/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setFeedback(feedback.map(f => f.id === id ? { ...f, status: status as 'open' | 'processed' } : f))
    } else {
      const err = await res.json()
      alert(err.error || '操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该反馈？')) return
    const res = await apiFetch(`/admin/feedback/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFeedback(feedback.filter(f => f.id !== id))
    } else {
      const err = await res.json()
      alert(err.error || '操作失败')
    }
  }

  const handleReplySubmit = async (id: number) => {
    const reply = replyDraft.trim()
    if (!reply) return
    const res = await apiFetch(`/admin/feedback/${id}/reply`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    })
    if (res.ok) {
      setReplyingId(null)
      setReplyDraft('')
      fetchFeedback(page, statusFilter)
    } else {
      const err = await res.json()
      alert(err.error || '操作失败')
    }
  }

  const filterBtns: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'open', label: '未处理' },
    { key: 'processed', label: '已处理' },
  ]

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4">
          ← 管理后台
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-6">反馈管理</h2>

        <div className="flex gap-2 mb-4">
          {filterBtns.map(btn => (
            <button
              key={btn.key}
              onClick={() => handleFilter(btn.key)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors
                ${statusFilter === btn.key
                  ? 'bg-mystic-gold text-mystic-bg'
                  : 'bg-mystic-card border border-mystic-gold/20 text-mystic-text/60 hover:border-mystic-gold/50'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-mystic-text/40 text-center py-8">加载中...</p>
        ) : feedback.length === 0 ? (
          <p className="text-mystic-text/40 text-center py-8">暂无反馈</p>
        ) : (
          <div className="space-y-2">
            {feedback.map(f => (
              <div key={f.id} className="bg-mystic-card/60 rounded-xl p-3 border border-mystic-gold/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-mystic-text/30 text-xs">#{f.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      f.status === 'open'
                        ? 'text-mystic-gold border-mystic-gold/30'
                        : 'text-green-400/80 border-green-500/30'
                    }`}>
                      {STATUS_LABELS[f.status]}
                    </span>
                    <span className="text-mystic-text/60 text-xs truncate">{f.userName}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <select
                      value={f.status}
                      onChange={e => handleStatusChange(f.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border bg-mystic-bg text-mystic-text/60 border-mystic-gold/10"
                    >
                      <option value="open">未处理</option>
                      <option value="processed">已处理</option>
                    </select>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-400/80 hover:bg-red-900/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p className="text-mystic-text/80 text-sm mb-2 whitespace-pre-wrap break-words">{f.content}</p>

                {f.reply && (
                  <div className="mt-2 p-3 bg-mystic-gold/10 border border-mystic-gold/20 rounded-lg">
                    <div className="text-mystic-gold/80 text-xs mb-1">管理员回复</div>
                    <p className="text-mystic-text/80 text-sm whitespace-pre-wrap break-words">{f.reply}</p>
                  </div>
                )}

                {replyingId === f.id ? (
                  <div className="mt-2">
                    <textarea
                      value={replyDraft}
                      onChange={e => setReplyDraft(e.target.value)}
                      rows={3}
                      placeholder="写下对用户的回复..."
                      autoFocus
                      className="w-full px-3 py-2 bg-mystic-bg border border-mystic-gold/20 rounded-lg text-mystic-text text-sm
                        placeholder:text-mystic-text/30 focus:outline-none focus:border-mystic-gold/50 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReplySubmit(f.id)}
                        disabled={!replyDraft.trim()}
                        className="text-xs px-3 py-1.5 rounded bg-mystic-gold text-mystic-bg disabled:opacity-40 hover:bg-yellow-500"
                      >
                        提交回复
                      </button>
                      <button
                        onClick={() => { setReplyingId(null); setReplyDraft('') }}
                        className="text-xs px-3 py-1.5 rounded border border-mystic-gold/20 text-mystic-text/50 hover:border-mystic-gold/40"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingId(f.id); setReplyDraft(f.reply || '') }}
                    className="mt-2 text-xs px-3 py-1.5 rounded border border-mystic-gold/20 text-mystic-gold/80 hover:border-mystic-gold/50"
                  >
                    {f.reply ? '修改回复' : '回复'}
                  </button>
                )}

                <div className="text-xs text-mystic-text/40 mt-1">
                  {f.readingId
                    ? <>关联记录 #{f.readingId}：{f.readingQuestion || '(记录已删除)'}</>
                    : '未关联记录'}
                </div>
                <div className="text-xs text-mystic-text/30 mt-1">
                  {new Date(f.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-mystic-card rounded text-sm text-mystic-text/60 disabled:opacity-30"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-mystic-text/40">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-mystic-card rounded text-sm text-mystic-text/60 disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
