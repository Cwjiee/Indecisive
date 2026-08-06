import { useAuth } from '../context/AuthContext'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, loginWithGoogle } = useAuth()

  if (loading) {
    return (
      <div className="setup-card" style={{ alignItems: 'center', gap: '16px', textAlign: 'center' }}>
        <div className="summary-emoji">⏳</div>
        <div className="section-label">Loading account…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="setup-card" style={{ alignItems: 'center', textAlign: 'center', gap: '20px' }}>
        <div className="create-page-hero" style={{ flexDirection: 'column', alignItems: 'center' }}>
          <span className="create-page-icon" style={{ fontSize: '42px' }} aria-hidden="true">🔐</span>
          <div>
            <div className="create-page-title" style={{ fontSize: '20px' }}>Sign in Required</div>
            <div className="create-page-sub">
              Please sign in with Google to create, join, and manage your hangouts
            </div>
          </div>
        </div>

        <button
          className="continue-btn"
          onClick={loginWithGoogle}
          style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '15px' }}
        >
          <span aria-hidden="true">🔑</span>
          Sign in with Google →
        </button>
      </div>
    )
  }

  return <>{children}</>
}
