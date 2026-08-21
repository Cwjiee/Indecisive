import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Switch, TextInput } from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { generateRoomCode } from '../utils/room'
import { saveRoomToHistory } from '../utils/db'
import { getStoredName, setStoredName } from '../utils/session'

type DateRangeValue = [string | null, string | null]

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const inputStyles = {
  input: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '16px',
  },
}

import { useAuth } from '../context/AuthContext'

export default function CreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name, setName] = useState(() => user?.displayName || getStoredName())
  const [hangoutName, setHangoutName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [hasDateRange, setHasDateRange] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>([null, null])

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Please enter your name so friends know who you are')
      return
    }
    if (hasDateRange && !dateRange[0]) {
      alert('Please select a start date for the room range.')
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
        ...(hasDateRange && dateRange[0] ? {
          dateRange: {
            start: dateRange[0].replaceAll('-', ''),
            end: (dateRange[1] || dateRange[0]).replaceAll('-', ''),
          },
        } : {}),
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

      {/* Room-wide date range */}
      <div className="setup-field">
        <div
          className="weekends-toggle-row"
          onClick={() => setHasDateRange(prev => !prev)}
          role="switch"
          aria-checked={hasDateRange}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') setHasDateRange(prev => !prev)
          }}
          id="date-range-toggle"
        >
          <div className="toggle-info">
            <span className="toggle-title">Limit dates to a range</span>
            <span className="toggle-sub">
              {hasDateRange ? 'Everyone will pick within this date range' : 'Everyone can choose any future date'}
            </span>
          </div>
          <Switch
            checked={hasDateRange}
            onChange={() => setHasDateRange(prev => !prev)}
            aria-label="Limit dates to a range"
            size="md"
            styles={{ root: { pointerEvents: 'none' } }}
          />
        </div>
        {hasDateRange && (
          <DatePicker
            className="create-date-range-picker"
            classNames={{
              day: 'create-date-range-day',
              weekday: 'create-date-range-weekday',
              calendarHeaderControl: 'create-date-range-header-control',
              calendarHeaderLevel: 'create-date-range-header-level',
            }}
            type="range"
            value={dateRange}
            onChange={setDateRange}
            minDate={toDateInputValue(new Date())}
            numberOfColumns={1}
            allowSingleDateInRange
            styles={{ month: { width: '100%' } }}
          />
        )}
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
