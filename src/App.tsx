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

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Header />
        <StepIndicator />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/pick/:code" element={<PickerPage />} />
          <Route path="/summary/:code" element={<SummaryPage />} />
          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}
