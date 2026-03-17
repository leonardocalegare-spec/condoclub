import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('condoclub_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('condoclub_token') || null)

  function login(userData, authToken) {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('condoclub_user', JSON.stringify(userData))
    localStorage.setItem('condoclub_token', authToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('condoclub_user')
    localStorage.removeItem('condoclub_token')
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
