const API_BASE = '/api'

export async function apiRefresh(): Promise<{ accessToken: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok ? res.json() : null
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
