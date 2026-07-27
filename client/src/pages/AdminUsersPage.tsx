import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface UserItem {
  id: number
  email?: string
  phone?: string
  displayName?: string
  role: string
  createdAt: string
}

interface Props {
  onBack: () => void
}

export default function AdminUsersPage({ onBack }: Props) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = (p: number, q: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (q) params.set('search', q)
    apiFetch(`/admin/users?${params}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setUsers(data.users)
          setTotalPages(data.pagination.totalPages)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers(page, search) }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers(1, search)
  }

  const handleRoleChange = async (userId: number, role: string) => {
    if (userId === currentUser?.id) {
      alert('不能修改自己的角色')
      return
    }
    const res = await apiFetch(`/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
    } else {
      const err = await res.json()
      alert(err.error || '操作失败')
    }
  }

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      alert('不能删除自己的账号')
      return
    }
    if (!confirm('确定删除该用户？关联的占卜记录也会被删除。')) return
    const res = await apiFetch(`/admin/users/${userId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setUsers(users.filter(u => u.id !== userId))
    } else {
      const err = await res.json()
      alert(err.error || '操作失败')
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4">
          ← 管理后台
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-6">用户管理</h2>

        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索邮箱/手机号/昵称..."
            className="flex-1 px-3 py-2 bg-mystic-card border border-mystic-gold/20 rounded-lg text-sm
              text-mystic-text placeholder:text-mystic-text/30 focus:outline-none focus:border-mystic-gold/50"
          />
          <button type="submit" className="px-4 py-2 bg-mystic-gold text-mystic-bg rounded-lg text-sm">
            搜索
          </button>
        </form>

        {loading ? (
          <p className="text-mystic-text/40 text-center py-8">加载中...</p>
        ) : users.length === 0 ? (
          <p className="text-mystic-text/40 text-center py-8">暂无用户</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-mystic-card/60 rounded-xl p-3 border border-mystic-gold/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-mystic-text/80 text-sm truncate block">
                      {u.displayName || u.email || u.phone}
                    </span>
                    <span className="text-mystic-text/30 text-xs">{u.email || u.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === currentUser?.id}
                      className={`text-xs px-2 py-1 rounded border bg-mystic-bg
                        ${u.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}
                        ${u.role === 'admin' ? 'text-mystic-gold border-mystic-gold/30' : 'text-mystic-text/60 border-mystic-gold/10'}`}
                    >
                      <option value="free">free</option>
                      <option value="premium">premium</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === currentUser?.id}
                      className={`text-xs px-2 py-1 rounded border border-red-500/30 text-red-400/80
                        ${u.id === currentUser?.id ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-900/20'}`}
                    >
                      删除
                    </button>
                  </div>
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
