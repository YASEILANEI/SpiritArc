const API_BASE = '/api'
let _refreshPromise: Promise<{ accessToken: string } | null> | null = null

export async function apiRefresh(): Promise<{ accessToken: string } | null> {
  try {
    if (!_refreshPromise) {
      _refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).then(r => r.ok ? r.json() : null).finally(() => { _refreshPromise = null })
    }
    return await _refreshPromise
  } catch {
    return null
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch { /* ignore */ }
}
