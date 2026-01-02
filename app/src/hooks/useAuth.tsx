import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, AuthState } from '@/types'
import { TOKEN_KEY, USER_KEY } from '@/lib/authStorage'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  loginAsDemo: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userJson = localStorage.getItem(USER_KEY)

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const result = await response.json()
      const { token, user } = result.data || result
      
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      setState({ user: null, isAuthenticated: false, isLoading: false })
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  /**
   * ⚠️ DEMO MODE - REMOVE BEFORE PRODUCTION ⚠️
   * 
   * This function bypasses authentication for demonstration purposes.
   * It allows new users to explore the template without setting up a database.
   * 
   * TO REMOVE:
   * 1. Delete this function
   * 2. Remove 'loginAsDemo' from AuthContextType interface
   * 3. Remove the demo button from LoginPage.tsx
   * 4. Search for 'DEMO_MODE' comments and remove related code
   */
  const loginAsDemo = () => {
    const demoUser: User = {
      id: 'demo-user-001',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    localStorage.setItem(TOKEN_KEY, 'demo-token-not-for-production')
    localStorage.setItem(USER_KEY, JSON.stringify(demoUser))
    
    setState({
      user: demoUser,
      isAuthenticated: true,
      isLoading: false,
    })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Re-export getAuthToken for backwards compatibility
export { getAuthToken } from '@/lib/authStorage'

