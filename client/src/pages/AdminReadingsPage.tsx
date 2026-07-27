import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface ReadingItem {
  id: number
  questionType: string
  question?: string
  spreadType: string
  readingSource?: string
  userId?: number
  userName?: string
  isPublic: boolean
  createdAt: string
  isDeleted?: boolean
  isHidden?: boolean
}

interface Props {
  onBack: () => void
}

const PAGE_SIZE = 8

export default function AdminReadingsPage({ onBack }: Props) {
  const [readings, setReadings] = useState<ReadingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [viewReading, setViewReading] = useState<{ id: number; content: string } | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const fetchReadings = (p: number) => {
    setLoading(true)
    apiFetch(`/admin/readings?page=${p}&limit=${PAGE_SIZE}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setReadings(data.readings)
          setTotalPages(data.pagination.totalPages)
          setSelectedIds(new Set())
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReadings(page) }, [page])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === readings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(readings.map(r => r.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`⚠ 确定要删除选中的 ${selectedIds.size} 条记录？\n\n删除后不可恢复！`)) return
    if (!confirm('再次确认：此操作不可撤销，选中记录将被永久删除。')) return

    setDeleting(true)
    try {
      const res = await apiFetch('/admin/readings/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        fetchReadings(page)
      } else {
        alert('删除失败，请重试')
      }
    } catch {
      alert('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const handleSingleDelete = async (id: number) => {
    if (!confirm('⚠ 确定要删除这条记录？\n\n删除后不可恢复！')) return
    const res = await apiFetch(`/admin/readings/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReadings(readings.filter(r => r.id !== id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const handleViewReading = async (id: number) => {
    setViewLoading(true)
    setViewReading({ id, content: '' })
    try {
      const res = await apiFetch(`/admin/readings/${id}`)
      if (res.ok) {
        const data = await res.json()
        setViewReading({ id, content: data.readingResult || '(无解读内容)' })
      } else {
        setViewReading({ id, content: '获取失败' })
      }
    } catch {
      setViewReading({ id, content: '获取失败' })
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4">
          ← 管理后台
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-6">占卜记录</h2>

        {loading ? (
          <p className="text-mystic-text/40 text-center py-8">加载中...</p>
        ) : readings.length === 0 ? (
          <p className="text-mystic-text/40 text-center py-8">暂无记录</p>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds(new Set()) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                    ${isBatchMode
                      ? 'bg-mystic-gold/20 text-mystic-gold border-mystic-gold/40'
                      : 'border-mystic-text/20 text-mystic-text/50 hover:text-mystic-text/80'
                    }`}
                >
                  批量操作
                </button>
                {isBatchMode && (
                  <label className="flex items-center gap-2 text-xs text-mystic-text/40 cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={readings.length > 0 && selectedIds.size === readings.length}
                      onChange={toggleAll}
                      className="accent-mystic-gold"
                    />
                    全选
                  </label>
                )}
              </div>
              {isBatchMode && selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400/80
                    hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? '删除中...' : `删除选中 (${selectedIds.size})`}
                </button>
              )}
            </div>

            {/* List */}
            <div className="space-y-2">
              {readings.map(r => (
                <div key={r.id} className="bg-mystic-card/60 rounded-xl p-3 border border-mystic-gold/10">
                  <div className="flex items-start gap-3">
                    {isBatchMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-mystic-gold mt-1"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-mystic-gold/80 text-sm font-serif">#{r.id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          r.readingSource === 'ai'
                            ? 'bg-green-900/30 text-green-400/80'
                            : 'bg-mystic-card text-mystic-text/40'
                        }`}>
                          {r.readingSource === 'ai' ? '牌灵' : r.readingSource === 'template' ? '模板' : 'unknown'}
                        </span>
                        {r.isHidden && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400/80">已隐藏</span>
                        )}
                        {r.isDeleted && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400/80">已删除</span>
                        )}
                        {r.isPublic ? (
                          <span className="text-xs text-mystic-text/30">公开</span>
                        ) : (
                          <span className="text-xs text-red-400/50">私有</span>
                        )}
                      </div>
                      <p className="text-mystic-text/60 text-sm truncate">
                        {r.question || `[${r.questionType}]`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-mystic-text/30">{r.spreadType}</span>
                        <span className="text-xs text-mystic-text/30">{r.userName || `用户 #${r.userId}`}</span>
                        <span className="text-xs text-mystic-text/30">
                          {new Date(r.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleViewReading(r.id)}
                        className="text-sm px-2 py-1 rounded border border-mystic-gold/20 text-mystic-gold/70
                          hover:bg-mystic-gold/10 transition-colors"
                      >
                        查看解读
                      </button>
                      <button
                        onClick={() => handleSingleDelete(r.id)}
                        className="text-sm px-2 py-1 rounded border border-red-500/30 text-red-400/80
                          hover:bg-red-900/20 shrink-0"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-mystic-card rounded-lg text-sm text-mystic-text/60
                disabled:opacity-30 hover:text-mystic-gold transition-colors"
            >
              上一页
            </button>
            <span className="text-sm text-mystic-text/40">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-mystic-card rounded-lg text-sm text-mystic-text/60
                disabled:opacity-30 hover:text-mystic-gold transition-colors"
            >
              下一页
            </button>
          </div>
        )}

        {/* View reading modal */}
        {viewReading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewReading(null)}
          >
            <div className="bg-mystic-card border border-mystic-gold/30 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-mystic-gold font-serif text-lg">解读内容 # {viewReading.id}</h3>
                <button
                  onClick={() => setViewReading(null)}
                  className="text-mystic-text/40 hover:text-mystic-text/70 text-xl"
                >
                  ✕
                </button>
              </div>
              {viewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin" />
                </div>
              ) : (
                <div className="text-mystic-text/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {viewReading.content}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
