import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput } from '@mantine/core'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { generateRoomCode } from '../utils/room'
import { saveRoomToHistory } from '../utils/db'
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

export default function CreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState(getStoredName)
  const [hangoutName, setHangoutName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Please enter your name so friends know who you are')
      return
    }
    setNameError(null)
    setIsCreating(true)

    const code = generateRoomCode()
    const roomName = hangoutName.trim() || 'Hangout'

    try {
      await setDoc(doc(db, 'rooms', code), {
        code,
        name: roomName,
        participants: [],
        createdAt: new Date(),
      })
      setStoredName(trimmedName)
      saveRoomToHistory(code)
      navigate(`/pick/${code}`)
    } catch (e) {
      console.error('Error creating room:', e)
      alert('Failed to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="setup-card">
      <div className="create-page-hero">
        <span className="create-page-icon" aria-hidden="true">📅</span>
        <div>
          <div className="create-page-title">Create a hangout</div>
          <div className="create-page-sub">
            Set up a shared room — everyone adds their own availability and you find dates that work for all
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="setup-field">
        <div className="section-label">Your name</div>
        <TextInput
          id="name-input"
          placeholder="e.g. Ali"
          value={name}
          onChange={e => { setName(e.currentTarget.value); setNameError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          size="md"
          radius="md"
          styles={inputStyles}
          aria-label="Your name"
          autoFocus
          error={nameError}
        />
      </div>

      {/* Hangout name */}
      <div className="setup-field">
        <div className="section-label">Hangout name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.6 }}>(optional)</span></div>
        <TextInput
          id="hangout-name-input"
          placeholder="e.g. Homestay BBQ, Weekend Trip…"
          value={hangoutName}
          onChange={e => setHangoutName(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          size="md"
          radius="md"
          styles={inputStyles}
          maxLength={40}
          aria-label="Hangout name"
        />
      </div>

      <button
        className="continue-btn setup-continue"
        onClick={handleCreate}
        id="create-room-btn"
        disabled={isCreating}
      >
        {isCreating ? 'Creating…' : 'Create & pick my dates →'}
      </button>

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
