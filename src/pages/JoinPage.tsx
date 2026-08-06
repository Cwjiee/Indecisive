import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput } from '@mantine/core'
import { getRoomFromDb, saveRoomToHistory } from '../utils/db'
import { getStoredName, setStoredName } from '../utils/session'

const inputStyles = {
  input: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '16px',
  },
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [name, setName] = useState(getStoredName)
  const [joinCode, setJoinCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 6) return

    setIsSearching(true)
    setSearchError(null)
    try {
      const room = await getRoomFromDb(code)
      if (room) {
        if (name.trim()) setStoredName(name.trim())
        saveRoomToHistory(code)
        navigate(`/room/${code}`)
      } else {
        setSearchError('Hangout not found. Double-check the code and try again.')
      }
    } catch {
      setSearchError('Failed to search. Check your connection.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="setup-card">
      <div className="create-page-hero">
        <span className="create-page-icon" aria-hidden="true">🔗</span>
        <div>
          <div className="create-page-title">Join a hangout</div>
          <div className="create-page-sub">
            Got a code from a friend? Enter it below to view the room and add your availability
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="setup-field">
        <div className="section-label">Your name</div>
        <TextInput
          id="name-input"
          placeholder="e.g. Alex"
          value={name}
          onChange={e => setName(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 6) handleJoin() }}
          size="md"
          radius="md"
          styles={inputStyles}
          aria-label="Your name"
          autoFocus
        />
      </div>

      {/* Room code */}
      <div className="setup-field">
        <div className="section-label">Room code</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <TextInput
            id="join-code-input"
            placeholder="e.g. K3M9PX"
            value={joinCode}
            onChange={e => {
              setJoinCode(e.currentTarget.value.toUpperCase().slice(0, 6))
              setSearchError(null)
            }}
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 6) handleJoin() }}
            size="md"
            radius="md"
            styles={inputStyles}
            style={{ flex: 1, fontFamily: "'SF Mono', 'Fira Code', monospace" }}
            maxLength={6}
            aria-label="Room code"
          />
          <button
            className="continue-btn"
            onClick={handleJoin}
            id="join-btn"
            disabled={isSearching || joinCode.length < 6}
            style={{ flexShrink: 0 }}
          >
            {isSearching ? '…' : 'Join →'}
          </button>
        </div>
        {searchError && (
          <div className="field-error">{searchError}</div>
        )}
      </div>

      <button
        className="back-btn"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => navigate('/')}
      >
        ← Back
      </button>
    </div>
  )
}
