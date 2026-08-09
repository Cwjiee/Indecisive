import { useState, useEffect } from 'react'
import ShareCard from './ShareCard'
import type { RoomData } from '../utils/room'
import { datesToStrings } from '../utils/room'
import { createRoomInDb, updateRoomParticipantsInDb, buildDbShareUrl, saveRoomToHistory } from '../utils/db'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

interface SummaryProps {
  dates: Date[]
  userName: string
  preRoomCode: string | null
  existingRoom: RoomData | null
  onBack: () => void
  onGoHome: () => void
  onViewRoom?: () => void
}

interface MonthGroup {
  label: string
  year: number
  month: number
  dates: Date[]
}

function isWeekend(date: Date): boolean {
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

function groupByMonth(dates: Date[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!map.has(key)) {
      map.set(key, {
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        year: date.getFullYear(),
        month: date.getMonth(),
        dates: [],
      })
    }
    map.get(key)!.dates.push(date)
  }
  return Array.from(map.values())
}

import { useAuth } from '../context/AuthContext'

export default function Summary({ dates, userName, preRoomCode, existingRoom, onBack, onGoHome, onViewRoom }: SummaryProps) {
  const { user } = useAuth()
  const groups = groupByMonth(dates)
  const totalDates   = dates.length

  const activeRoomCode = preRoomCode || existingRoom?.code || null

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCode, setSavedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-save to Firestore if we have a room context active
  useEffect(() => {
    if (!activeRoomCode) return

    async function autoSaveAvailability() {
      setIsSaving(true)
      setSaveError(null)
      try {
        const serialized = datesToStrings(dates)
        const userInfo = user ? { userId: user.uid, userEmail: user.email || undefined } : undefined

        if (existingRoom) {
          // Overwrite existing user's selection by userId or name
          const updatedParticipants = [...existingRoom.participants]
          const existingIdx = updatedParticipants.findIndex(
            p => (user && p.userId === user.uid) || p.name.toLowerCase() === userName.toLowerCase()
          )

          const newParticipantData = {
            name: userName,
            dates: serialized,
            ...(user && { userId: user.uid, userEmail: user.email || undefined }),
          }

          if (existingIdx !== -1) {
            updatedParticipants[existingIdx] = newParticipantData
          } else {
            updatedParticipants.push(newParticipantData)
          }

          await updateRoomParticipantsInDb(existingRoom.code, updatedParticipants)
        } else {
          // Overwrites the empty room with the creator's selection
          await createRoomInDb(userName, serialized, preRoomCode, userInfo)
        }
        saveRoomToHistory(activeRoomCode!)
        setSavedCode(activeRoomCode)
      } catch (e) {
        console.error('Error auto-saving availability:', e)
        setSaveError('Failed to save to Firestore. Please click retry.')
      } finally {
        setIsSaving(false)
      }
    }

    autoSaveAvailability()
  }, [activeRoomCode, userName, dates, existingRoom, preRoomCode, user])

  const shareUrl = savedCode ? buildDbShareUrl(savedCode) : ''

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleRetry = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const serialized = datesToStrings(dates)
      if (existingRoom) {
        const updatedParticipants = [...existingRoom.participants]
        const existingIdx = updatedParticipants.findIndex(
          p => p.name.toLowerCase() === userName.toLowerCase()
        )

        if (existingIdx !== -1) {
          updatedParticipants[existingIdx] = { name: userName, dates: serialized }
        } else {
          updatedParticipants.push({ name: userName, dates: serialized })
        }

        await updateRoomParticipantsInDb(existingRoom.code, updatedParticipants)
      } else {
        await createRoomInDb(userName, serialized, preRoomCode)
      }
      saveRoomToHistory(activeRoomCode!)
      setSavedCode(activeRoomCode)
    } catch (e) {
      console.error('Retry save failed:', e)
      setSaveError('Failed to save to Firestore. Please click retry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="summary-view">
      {/* Header */}
      <div className="summary-header">
        <h1 className="summary-title">
          {totalDates === 0 ? 'No dates available' : `You're free on ${totalDates} ${totalDates === 1 ? 'day' : 'days'}!`}
        </h1>
        <p className="summary-subtitle">
          {totalDates === 0 ? 'You can update your availability later if your plans change.' : 'Here\'s your availability at a glance'}
        </p>
      </div>

      {/* Date chips grouped by month */}
      {groups.map((group, groupIdx) => (
        <div
          key={`${group.year}-${group.month}`}
          className="summary-month-group"
          style={{ animationDelay: `${groupIdx * 0.08}s` }}
        >
          <div className="summary-month-label">{group.label}</div>
          <div className="summary-dates-grid" role="list">
            {group.dates.map((date, i) => {
              const dow  = date.getDay()
              const wknd = isWeekend(date)
              return (
                <div
                  key={date.toISOString()}
                  className="summary-date-chip"
                  role="listitem"
                  style={{ animationDelay: `${groupIdx * 0.08 + i * 0.04}s` }}
                >
                  <span className="chip-day-name">{DAY_NAMES_SHORT[dow]}</span>
                  <span className="chip-day-num">{date.getDate()}</span>
                  <span className="chip-month">{SHORT_MONTH[date.getMonth()]}</span>
                  {wknd && <span className="chip-weekend-badge">Weekend</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Sharing block */}
      <div className="summary-actions">
        {activeRoomCode ? (
          <div className="share-card">
            <div className="share-card-header">
              <span className="share-card-icon" aria-hidden="true">
                {isSaving ? '⏳' : saveError ? '⚠️' : '✅'}
              </span>
              <div>
                <div className="share-card-title">
                  {isSaving
                    ? 'Saving to hangout...'
                    : saveError
                    ? 'Sync Error'
                    : 'Availability Synced!'}
                </div>
                <div className="share-card-sub">
                  {isSaving
                    ? `Writing your dates to hangout room ${activeRoomCode}...`
                    : saveError
                    ? saveError
                    : `Your dates are saved. Share this link so friends can join room ${activeRoomCode}`}
                </div>
              </div>
            </div>

            {saveError && (
              <button className="generate-btn" onClick={handleRetry}>
                Retry Sync
              </button>
            )}

            {!isSaving && !saveError && savedCode && (
              <div className="generated-result" style={{ marginTop: '4px' }}>
                <div className="room-code-row">
                  <span className="room-code-label">Room code</span>
                  <span className="room-code-value">{savedCode}</span>
                </div>
                <div className="copy-url-row">
                  <input
                    className="url-input"
                    value={shareUrl}
                    readOnly
                    aria-label="Shareable room URL"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    id="copy-link-btn"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ShareCard
            myDates={dates}
            existingRoom={existingRoom}
            defaultName={userName}
            preRoomCode={preRoomCode}
          />
        )}

        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button className="back-btn" onClick={onBack} id="back-btn" style={{ flex: 1 }}>
            <span aria-hidden="true">←</span>
            Edit dates
          </button>
          {onViewRoom && savedCode && !isSaving && !saveError && (
            <button className="continue-btn" onClick={onViewRoom} id="view-room-btn" style={{ flex: 1 }}>
              View Room →
            </button>
          )}
          <button className="back-btn" onClick={onGoHome} id="home-btn" style={{ flex: 1 }}>
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
