import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  loginWithGoogle: () => Promise<User | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => null,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      // Check for redirect result on mount (if user was redirected back from Google sign-in)
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            setUser(result.user)
          }
        })
        .catch((error) => {
          console.warn('Firebase Auth redirect result error:', error)
        })

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)
        setLoading(false)
      }, (error) => {
        console.warn('Firebase Auth state error:', error)
        setLoading(false)
      })
      return () => unsubscribe()
    } catch (err) {
      console.warn('Firebase Auth failed to initialize:', err)
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (e: any) {
      // Handle popup-blocked or popup-closed-by-browser by falling back to redirect method
      if (
        e?.code === 'auth/popup-blocked' ||
        e?.code === 'auth/popup-closed-by-browser' ||
        e?.message?.includes('popup-blocked')
      ) {
        console.warn('Popup blocked by browser. Falling back to redirect sign-in...')
        try {
          await signInWithRedirect(auth, googleProvider)
          return null
        } catch (redirectErr: any) {
          console.error('Google redirect sign-in error:', redirectErr)
          alert(`Google Sign-In failed: ${redirectErr?.message || redirectErr}`)
          return null
        }
      }

      // Ignore user closing the popup manually without attempting sign-in
      if (e?.code === 'auth/cancelled-popup-request') {
        return null
      }

      console.error('Google sign-in error:', e)
      alert(`Google Sign-In failed: ${e?.message || e}`)
      return null
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

