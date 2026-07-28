import { useEffect, useState, useMemo } from 'react'
import type { Reading, LocalReading } from '../types'
import { SPREAD_LABELS } from '../types'
import { fetchReadings, apiFetch } from '../api'
import PageContainer from '../components/PageContainer'

interface Props {
  onBack: () => void
  onSelect: (reading: Reading | LocalReading) => void
  onSelectResult: (reading: Reading | LocalReading) => void
}

const PAGE_SIZE = 8

export default function HistoryPage({ onBack, onSelect, onSelectResult }: Props) {
  const [readings, setReadings] = useState<(Reading | LocalReading)[]>([])
  const [hiddenReadings, setHiddenReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    setLoading(true)
    if (showHidden) {
      apiFetch('/readings?filter=hidden').then(res => {
        if (res.ok) return res.json()
      }).then(data => {
        if (data) setHiddenReadings(data)
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      fetchReadings().then(data => {
        setReadings(data)
        setLoading(false)
      })
    }
    setPage(1)
    setSelectedIds(new Set())
    setIsBatchMode(false)
  }, [showHidden])

  const activeItems = showHidden ? hiddenReadings : readings
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => activeItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [activeItems, page]
  )
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === pageItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pageItems.map(r => r.id)))
    }
  }

  const handleHide = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/readings/${id}/hide`, { method: 'POST' })
      if (!res.ok) throw new Error('隐藏失败')
      setReadings(readings.filter(r => r.id !== id))
    } catch {
      alert('隐藏失败，请稍后重试')
    }
  }

  const handleUnhide = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await apiFetch(`/readings/${id}/unhide`, { method: 'POST' })
      if (!res.ok) throw new Error('恢复失败')
      setHiddenReadings(hiddenReadings.filter(r => r.id !== id))
    } catch {
      alert('恢复失败，请稍后重试')
    }
  }

  const handleBatchUnhide = async () => {
    if (selectedIds.size === 0) return
    const serverIds = Array.from(selectedIds).filter(id => typeof id === 'number') as number[]
    try {
      const res = await apiFetch('/readings/batch-unhide', {
        method: 'POST',
        body: JSON.stringify({ ids: serverIds }),
      })
      if (!res.ok) throw new Error('恢复失败')
      setHiddenReadings(hiddenReadings.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
    } catch {
      alert('恢复失败，请稍后重试')
    }
  }

  const handleBatchHide = async () => {
    if (selectedIds.size === 0) return
    const serverIds = Array.from(selectedIds).filter(id => typeof id === 'number') as number[]
    try {
      const res = await apiFetch('/readings/batch-hide', {
        method: 'POST',
        body: JSON.stringify({ ids: serverIds }),
      })
      if (!res.ok) throw new Error('隐藏失败')
      setReadings(readings.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
    } catch {
      alert('隐藏失败，请稍后重试')
    }
  }

  const handleDelete = async (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('⚠ 确定删除这条占卜记录？\n\n删除后不可恢复！')) return
    if (typeof id === 'number') {
      try {
        const res = await apiFetch(`/readings/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('删除失败')
      } catch {
        alert('删除失败，请稍后重试')
        return
      }
    } else {
      const all = JSON.parse(localStorage.getItem('tarot_readings') || '[]')
      const filtered = all.filter((r: LocalReading) => r.id !== id)
      localStorage.setItem('tarot_readings', JSON.stringify(filtered))
    }
    setReadings(readings.filter(r => r.id !== id))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`⚠ 确定要删除选中的 ${selectedIds.size} 条记录？\n\n删除后不可恢复！`)) return
    setDeleting(true)
    const serverIds: number[] = []
    const localIds: string[] = []
    for (const id of selectedIds) {
      if (typeof id === 'number') serverIds.push(id)
      else localIds.push(id)
    }
    try {
      if (serverIds.length > 0) {
        const res = await apiFetch('/readings/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ ids: serverIds }),
        })
        if (!res.ok) throw new Error('删除失败')
      }
      if (localIds.length > 0) {
        const all = JSON.parse(localStorage.getItem('tarot_readings') || '[]')
        const filtered = all.filter((r: LocalReading) => !localIds.includes(r.id))
        localStorage.setItem('tarot_readings', JSON.stringify(filtered))
      }
      setReadings(readings.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
    } catch {
      alert('删除失败，请稍后重试')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center min-h-[70vh] text-center">
        {/* Decorative header */}
        <div className="pt-8 pb-6">
          <div className="text-5xl text-mystic-gold/60 mb-6">⟡</div>
          <h2 className="text-2xl font-serif text-mystic-gold mb-4">占卜记录</h2>
          <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-4 rounded-full" />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <button
            onClick={() => setShowHidden(false)}
            className={`transition-colors ${!showHidden ? 'text-mystic-gold' : 'text-mystic-text/40 hover:text-mystic-text/60'}`}
          >
            当前记录
          </button>
          <button
            onClick={() => setShowHidden(true)}
            className={`transition-colors ${showHidden ? 'text-mystic-gold' : 'text-mystic-text/40 hover:text-mystic-text/60'}`}
          >
            已隐藏
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-mystic-text/40">加载中...</p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-mystic-text/40 mb-4">
              {showHidden ? '没有已隐藏的记录' : '还没有占卜记录'}
            </p>
            {!showHidden && (
              <button onClick={onBack} className="px-6 py-2 bg-mystic-gold text-mystic-bg rounded-full text-sm">
                开始第一次占卜
              </button>
            )}
          </div>
        ) : (
          <div className="w-full text-left">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {!showHidden && (
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
                )}
                {isBatchMode && (
                  <label className="flex items-center gap-2 text-xs text-mystic-text/40 cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={pageItems.length > 0 && selectedIds.size === pageItems.length}
                      onChange={toggleAll}
                      className="accent-mystic-gold"
                    />
                    全选
                  </label>
                )}
              </div>
              {isBatchMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  {showHidden ? (
                    <button onClick={handleBatchUnhide} className="text-xs px-3 py-1.5 rounded-lg border border-mystic-gold/30 text-mystic-gold/80 hover:bg-mystic-gold/10 transition-colors">
                      恢复选中 ({selectedIds.size})
                    </button>
                  ) : (
                    <>
                      <button onClick={handleBatchHide} className="text-xs px-3 py-1.5 rounded-lg border border-mystic-text/20 text-mystic-text/50 hover:text-mystic-text/80 transition-colors">
                        隐藏选中 ({selectedIds.size})
                      </button>
                      <button onClick={handleBatchDelete} disabled={deleting} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400/80 hover:bg-red-900/20 transition-colors disabled:opacity-50">
                        {deleting ? '删除中...' : `删除选中 (${selectedIds.size})`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-3 pb-6">
              {pageItems.map(r => {
                const card = r.cards[0]
                const date = new Date(r.createdAt).toLocaleString('zh-CN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
                const spreadLabel = r.spreadType === 'three-card' ? '三张牌' : '单张牌'
                return (
                  <div
                    key={String(r.id)}
                    className="flex items-start gap-3 bg-mystic-card/60 rounded-xl p-4 border border-mystic-gold/10
                      hover:border-mystic-gold/30 transition-all cursor-pointer"
                    onClick={() => onSelect(r)}
                  >
                    {isBatchMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        onClick={e => e.stopPropagation()}
                        className="accent-mystic-gold mt-5"
                      />
                    )}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-16 bg-gradient-to-br from-mystic-card to-purple-800 rounded-lg
                        border border-mystic-gold/30 flex items-center justify-center flex-shrink-0 relative"
                      >
                        <span className="text-mystic-gold text-xs">
                          {card?.position === 'down' ? '⬇' : '⬆'}
                        </span>
                        {r.cards.length > 1 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-mystic-gold text-mystic-bg
                            rounded-full text-xs flex items-center justify-center font-bold">{r.cards.length}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-mystic-gold font-serif truncate">
                            {r.cards.map(c => c.nameCn).join(' · ')}
                          </span>
                          {!showHidden && (
                            <button onClick={(e) => { e.stopPropagation(); onSelectResult(r) }}
                              className="text-sm text-mystic-gold/50 hover:text-mystic-gold whitespace-nowrap ml-auto">
                              查看解读
                            </button>
                          )}
                          {typeof r.id === 'number' && (
                            showHidden ? (
                              <button onClick={(e) => handleUnhide(r.id as number, e)}
                                className="text-sm text-mystic-text/30 hover:text-mystic-gold whitespace-nowrap">
                                恢复
                              </button>
                            ) : (
                              <button onClick={(e) => handleHide(r.id as number, e)}
                                className="text-sm text-mystic-text/30 hover:text-mystic-text/60 whitespace-nowrap">
                                隐藏
                              </button>
                            )
                          )}
                          {!showHidden && (
                            <button onClick={(e) => handleDelete(r.id, e)}
                              className="text-sm text-red-400/50 hover:text-red-400 whitespace-nowrap">
                              删除
                            </button>
                          )}
                        </div>
                        {r.question && (
                          <p className="text-mystic-text/50 text-sm truncate">{r.question}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-mystic-text/30">{spreadLabel}</span>
                          <span className="text-xs text-mystic-text/30">{date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pb-6">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-mystic-card rounded-lg text-sm text-mystic-text/60
                    disabled:opacity-30 hover:text-mystic-gold transition-colors">
                  上一页
                </button>
                <span className="text-sm text-mystic-text/40">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-mystic-card rounded-lg text-sm text-mystic-text/60
                    disabled:opacity-30 hover:text-mystic-gold transition-colors">
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
