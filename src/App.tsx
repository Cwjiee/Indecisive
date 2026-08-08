import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import JoinPage from './pages/JoinPage'
import RoomPage from './pages/RoomPage'
import PickerPage from './pages/PickerPage'
import SummaryPage from './pages/SummaryPage'

/**
 * Step indicator shown on /create, /pick/*, /summary/*
 * Step 0 = create/setup, Step 1 = pick dates, Step 2 = summary
 */
function StepIndicator() {
  const { pathname } = useLocation()

  const step = pathname.startsWith('/summary')
    ? 2
    : pathname.startsWith('/pick')
    ? 1
    : pathname.startsWith('/create')
    ? 0
    : null

  if (step === null) return null

  return (
    <div className="step-indicator" role="progressbar" aria-label="Progress">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
        />
      ))}
    </div>
  )
}

import { AuthProvider, useAuth } from './context/AuthContext'

function AuthFallback() {
  const { authError, clearAuthError, loginWithGoogle } = useAuth()

  if (!authError) return null

  return (
    <main className="auth-fallback" role="alert">
      <div className="auth-fallback-icon" aria-hidden="true">🔐</div>
      <div className="create-page-title">Google sign-in needs attention</div>
      <p className="create-page-sub">{authError}</p>
      <p className="auth-fallback-help">If you use private browsing, an ad blocker, or strict tracking protection, temporarily allow popups and cookies for this site.</p>
      <div className="auth-fallback-actions">
        <button className="continue-btn" onClick={loginWithGoogle}>Try again</button>
        <button className="clear-btn" onClick={clearAuthError}>Continue without signing in</button>
      </div>
    </main>
  )
}

function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, loginWithGoogle, logout } = useAuth()
  const isHome = pathname === '/'

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div
          className="app-header-brand"
          style={{ cursor: isHome ? 'default' : 'pointer' }}
          onClick={() => { if (!isHome) navigate('/') }}
          title={isHome ? undefined : 'Back to home'}
        >
          <div className="app-logo">
            <div className="app-logo-icon">🗓️</div>
            <span className="app-logo-text">indecisive</span>
          </div>
          <p className="app-tagline">No Bojio!!!</p>
        </div>

        {/* User Auth Profile / Login */}
        <div className="header-auth-badge">
          {user ? (
            <div className="user-profile-badge">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" />
              ) : (
                <span className="user-avatar-placeholder">{user.displayName?.[0] || '👤'}</span>
              )}
              <span className="user-name">{user.displayName || user.email}</span>
              <button className="auth-btn logout-btn" onClick={logout} title="Sign Out">
                Sign Out
              </button>
            </div>
          ) : (
            <button className="auth-btn google-login-btn" onClick={loginWithGoogle}>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

import AuthGate from './components/AuthGate'

function AppContent() {
  const { authError } = useAuth()

  return (
    <div className="app">
      <Header />
      {authError ? <AuthFallback /> : (
        <>
          <StepIndicator />
          <Routes>
            {/* Public Home Landing */}
            <Route path="/" element={<HomePage />} />

            {/* Protected Routes — Require Sign In when accessed */}
            <Route path="/create" element={<AuthGate><CreatePage /></AuthGate>} />
            <Route path="/join" element={<AuthGate><JoinPage /></AuthGate>} />
            <Route path="/room/:code" element={<AuthGate><RoomPage /></AuthGate>} />
            <Route path="/pick/:code" element={<AuthGate><PickerPage /></AuthGate>} />
            <Route path="/summary/:code" element={<AuthGate><SummaryPage /></AuthGate>} />
            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
