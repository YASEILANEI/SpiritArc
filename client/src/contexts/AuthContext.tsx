import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, AuthResponse } from '../types'
import { setAccessToken as setApiToken, setOnAuthExpired } from '../api'
import { apiRefresh, apiLogout } from '../api/auth'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (account: string, password: string) => Promise<void>
  register: (email: string | undefined, phone: string | undefined, password: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const updateToken = useCallback((token: string | null) => {
    setAccessTokenState(token)
    setApiToken(token)
  }, [])

  // Register session expiry handler
  useEffect(() => {
    setOnAuthExpired(() => {
      updateToken(null)
      setUser(null)
    })
  }, [updateToken])

  // Try to restore session on mount via refresh token cookie
  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const data = await apiRefresh()
        if (!data || cancelled) {
          if (!cancelled) setIsLoading(false)
          return
        }
        updateToken(data.accessToken)
        // Fetch user info
        const userRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          credentials: 'include',
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          if (!cancelled) setUser(userData)
        }
      } catch {
        // No valid session
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    restore()
    return () => { cancelled = true }
  }, [updateToken])

  const login = useCallback(async (account: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password }),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '登录失败' }))
      throw new Error(err.error)
    }
    const data: AuthResponse = await res.json()
    updateToken(data.accessToken)
    setUser(data.user)
  }, [updateToken])

  const register = useCallback(async (email: string | undefined, phone: string | undefined, password: string, displayName?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined, phone: phone || undefined, password, displayName }),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '注册失败' }))
      throw new Error(err.error)
    }
    const data: AuthResponse = await res.json()
    updateToken(data.accessToken)
    setUser(data.user)
  }, [updateToken])

  const logout = useCallback(async () => {
    await apiLogout()
    updateToken(null)
    setUser(null)
  }, [updateToken])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setAccessToken: updateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
