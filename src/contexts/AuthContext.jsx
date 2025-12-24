import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Senha de acesso ao CRM (compartilhada entre você e Adel)
const CRM_PASSWORD = 'medeiros2025' // ALTERE ESTA SENHA!

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Verifica se já está autenticado no localStorage
    const auth = localStorage.getItem('crm_auth')
    if (auth === 'true') {
      const savedUser = localStorage.getItem('crm_user')
      setIsAuthenticated(true)
      setUser(savedUser ? JSON.parse(savedUser) : { role: 'admin' })
    }
  }, [])

  const login = (password, username = 'Admin') => {
    if (password === CRM_PASSWORD) {
      const userData = { username, role: 'admin', loginAt: new Date().toISOString() }
      setIsAuthenticated(true)
      setUser(userData)
      localStorage.setItem('crm_auth', 'true')
      localStorage.setItem('crm_user', JSON.stringify(userData))
      return { success: true }
    }
    return { success: false, error: 'Senha incorreta' }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('crm_auth')
    localStorage.removeItem('crm_user')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
