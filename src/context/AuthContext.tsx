import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { setUserId } from 'firebase/analytics'
import { auth, googleProvider, analytics } from '../firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  authError: string | null
  loginWithGoogle: () => Promise<User | null>
  clearAuthError: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  loginWithGoogle: async () => null,
  clearAuthError: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

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
          setAuthError('Google sign-in could not be completed. Please try again.')
        })

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)
        setLoading(false)
        // Link the authenticated user to GA4 analytics events
        if (analytics) {
          setUserId(analytics, currentUser?.uid ?? null)
        }
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
    setAuthError(null)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (e: any) {
      // Keep the user in the app when the browser will not allow a popup. A
      // redirect can send users to a provider error/404 page, so show recovery
      // instructions here instead.
      if (
        e?.code === 'auth/popup-blocked' ||
        e?.code === 'auth/popup-closed-by-browser' ||
        e?.message?.includes('popup-blocked')
      ) {
        console.warn('Google sign-in popup was blocked or closed:', e)
        setAuthError('Your browser blocked the Google sign-in window. Allow popups for this site, then try again.')
        return null
      }

      // Ignore user closing the popup manually without attempting sign-in
      if (e?.code === 'auth/cancelled-popup-request') {
        return null
      }

      console.error('Google sign-in error:', e)
      setAuthError('Google sign-in failed. Please try again, or check your browser/network settings.')
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
    <AuthContext.Provider value={{ user, loading, authError, loginWithGoogle, clearAuthError: () => setAuthError(null), logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
