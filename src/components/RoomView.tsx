import { useState } from 'react'
import { Tooltip } from '@mantine/core'
import {
  type RoomData,
  type BusyTimes,
  PARTICIPANT_COLORS,
  getOverlapDates,
  stringsToDate,
  datesToStrings,
  formatBusyRange,
} from '../utils/room'
import { getStoredName, setStoredName } from '../utils/session'
import { finalizeRoomDateInDb, deleteRoomFromDb } from '../utils/db'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildGoogleCalendarUrl(dateStr: string, roomName: string, roomCode: string, participantNames: string[]): string {
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(4, 6)
  const d = dateStr.slice(6, 8)

  // End date = next day (Google Calendar all-day events are exclusive of end date)
  const startDate = new Date(Number(y), Number(m) - 1, Number(d))
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)
  const endStr = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`

  const title = encodeURIComponent(roomName || `Hangout (${roomCode})`)
  const details = encodeURIComponent(
    `Hangout organized on Indecisive \nAttendees: ${participantNames.join(', ')}\n`
  )

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${endStr}&details=${details}`
}

interface RoomViewProps {
  room: RoomData
  onAddDates: () => void
  onGoHome: () => void
  onEditParticipant: (name: string, dates: string[], busyTimes?: BusyTimes) => void
}

import { useAuth } from '../context/AuthContext'

export default function RoomView({ room, onAddDates, onGoHome, onEditParticipant }: RoomViewProps) {
  const { user } = useAuth()
  const [userName, setUserName] = useState(() => getStoredName() || user?.displayName || '')
  const [pendingEdit, setPendingEdit] = useState<{ name: string; dates: string[]; busyTimes?: BusyTimes } | null>(null)
  
  // Final Decision state
  const [pendingFinalizeDate, setPendingFinalizeDate] = useState<Date | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  // Delete Hangout state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Re-open date selection state
  const [showReopenModal, setShowReopenModal] = useState(false)

  const isCreator = Boolean(
    user && (room.creatorId === user.uid || (room.participants[0]?.userId === user.uid))
  )

  const overlap = getOverlapDates(room.participants)
  const overlapDates = stringsToDate(Array.from(overlap)).sort((a, b) => a.getTime() - b.getTime())

  // Check if current authenticated user has already submitted availability in this room
  const currentUserParticipant = room.participants.find(
    p => (user && p.userId === user.uid) || (userName && p.name.toLowerCase() === userName.toLowerCase())
  )

  const handleAddDatesClick = () => {
    const nameToUse = userName.trim() || user?.displayName || 'You'
    setStoredName(nameToUse)
    onAddDates()
  }

  const handleEditParticipantClick = (p: { name: string; dates: string[]; busyTimes?: BusyTimes; userId?: string }) => {
    const isSelf = (user && p.userId === user.uid) || (userName && p.name.toLowerCase() === userName.toLowerCase())
    if (isSelf) {
      // Direct edit without modal for own dates
      onEditParticipant(p.name, p.dates, p.busyTimes)
    } else {
      // Warning modal for editing someone else's dates
      setPendingEdit({ name: p.name, dates: p.dates, busyTimes: p.busyTimes })
    }
  }

  const handleConfirmEdit = () => {
    if (!pendingEdit) return
    onEditParticipant(pendingEdit.name, pendingEdit.dates, pendingEdit.busyTimes)
    setPendingEdit(null)
  }

  const handleConfirmFinalize = async () => {
    if (!pendingFinalizeDate) return
    setIsFinalizing(true)
    try {
      const dateStr = datesToStrings([pendingFinalizeDate])[0]
      await finalizeRoomDateInDb(room.code, dateStr)
      setPendingFinalizeDate(null)
    } catch (e) {
      console.error('Error finalizing room date:', e)
      alert('Failed to save final decision. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleClearFinalDecision = async (): Promise<boolean> => {
    setIsFinalizing(true)
    try {
      await finalizeRoomDateInDb(room.code, null)
      return true
    } catch (e) {
      console.error('Error clearing final decision:', e)
      return false
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleDeleteRoom = async () => {
    setIsDeleting(true)
    try {
      await deleteRoomFromDb(room.code)
      onGoHome()
    } catch (e) {
      console.error('Error deleting room:', e)
      alert('Failed to delete hangout. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="room-view">
      {/* Delete Room Confirmation Modal */}
      {showDeleteModal && (
        <div className="edit-disclaimer-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="edit-disclaimer-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-disclaimer-title">Delete this hangout?</div>
            <div className="edit-disclaimer-body">
              Are you sure you want to permanently delete <strong>{room.name || room.code}</strong>? This action cannot be undone.
            </div>
            <div className="edit-disclaimer-actions">
              <button className="back-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="continue-btn"
                onClick={handleDeleteRoom}
                disabled={isDeleting}
                style={{ background: '#b84040' }}
              >
                {isDeleting ? 'Deleting…' : 'Delete Hangout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-open Date Selection Confirmation Modal */}
      {showReopenModal && (
        <div className="edit-disclaimer-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="edit-disclaimer-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-disclaimer-title">Re-open date selection?</div>
            <div className="edit-disclaimer-body">
              This will clear the finalized date and let everyone update their availability again.
            </div>
            <div className="edit-disclaimer-actions">
              <button className="back-btn" onClick={() => setShowReopenModal(false)} disabled={isFinalizing}>
                Cancel
              </button>
              <button
                className="continue-btn"
                onClick={async () => {
                  const reopened = await handleClearFinalDecision()
                  if (reopened) setShowReopenModal(false)
                }}
                disabled={isFinalizing}
              >
                {isFinalizing ? 'Re-opening…' : 'Re-open selection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Decision Confirmation Modal */}
      {pendingFinalizeDate && (
        <div className="edit-disclaimer-overlay" onClick={() => setPendingFinalizeDate(null)}>
          <div className="edit-disclaimer-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-disclaimer-title">Confirm Final Hangout Date?</div>
            <div className="edit-disclaimer-body">
              Are you sure you want to set <strong>{DAY_SHORT[pendingFinalizeDate.getDay()]}, {SHORT_MONTH[pendingFinalizeDate.getMonth()]} {pendingFinalizeDate.getDate()}, {pendingFinalizeDate.getFullYear()}</strong> as the official date for this hangout?
            </div>
            <div className="edit-disclaimer-actions">
              <button className="back-btn" onClick={() => setPendingFinalizeDate(null)}>
                Cancel
              </button>
              <button className="continue-btn" onClick={handleConfirmFinalize} disabled={isFinalizing}>
                {isFinalizing ? 'Saving…' : 'Lock in Date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {pendingEdit && (
        <div className="edit-disclaimer-overlay" onClick={() => setPendingEdit(null)}>
          <div className="edit-disclaimer-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-disclaimer-icon">⚠️</div>
            <div className="edit-disclaimer-title">Edit {pendingEdit.name}'s dates?</div>
            <div className="edit-disclaimer-body">
              Please only edit availability if you are <strong>{pendingEdit.name}</strong>. Editing someone else's dates will update their responses in this room.
            </div>
            <div className="edit-disclaimer-actions">
              <button className="back-btn" onClick={() => setPendingEdit(null)}>
                Cancel
              </button>
              <button className="continue-btn" onClick={handleConfirmEdit}>
                I am {pendingEdit.name} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room header */}
      <div className="room-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative' }}>
          <div className="room-code-badge" style={{ marginBottom: 0 }}>
            <span className="room-code-badge-label">Room</span>
            <span className="room-code-badge-code">{room.code}</span>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#b84040',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Delete this hangout"
            >
              Delete
            </button>
          )}
        </div>
        <h1 className="room-title" style={{ marginTop: '12px' }}>
          {room.name ? room.name : 'When can everyone hang?'}
        </h1>
        <p className="room-subtitle">
          {room.participants.length} {room.participants.length === 1 ? 'person has' : 'people have'} shared their availability
        </p>
      </div>

      {/* Finalized Banner if date is locked in */}
      {room.finalDate && (() => {
        const fDate = stringsToDate([room.finalDate])[0]
        const calendarUrl = buildGoogleCalendarUrl(
          room.finalDate,
          room.name || '',
          room.code,
          room.participants.map(p => p.name)
        )
        return (
          <div className="finalized-banner">
            <div className="finalized-header">
              <div>
                <div className="finalized-title">It's Official! Hangout Date Locked In</div>
                <div className="finalized-sub">Everyone prepare for</div>
              </div>
            </div>
            <div className="finalized-date-display">
              <span className="finalized-day-name">{DAY_SHORT[fDate.getDay()]}</span>
              <span className="finalized-day-num">{fDate.getDate()}</span>
              <span className="finalized-month">{SHORT_MONTH[fDate.getMonth()]} {fDate.getFullYear()}</span>
            </div>
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="continue-btn"
              style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', justifyContent: 'center' }}
            >
              <span aria-hidden="true">📅</span> Add to Google Calendar
            </a>
            <button className="regenerate-btn" onClick={() => setShowReopenModal(true)} style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              Re-open date selection
            </button>
          </div>
        )
      })()}

      {/* Overlap section & Final Decision CTA */}
      {overlapDates.length > 0 && !room.finalDate && (
        <div className="overlap-section">
          <div className="overlap-header">
            <div>
              <div className="overlap-title">Everyone's free on {overlapDates.length} {overlapDates.length === 1 ? 'date' : 'dates'}!</div>
              <div className="overlap-sub">Click a date below to lock it in as the final decision</div>
            </div>
          </div>
          <div className="overlap-chips">
            {overlapDates.map(date => (
              <button
                key={date.toISOString()}
                className="overlap-chip overlap-chip-selectable"
                onClick={() => setPendingFinalizeDate(date)}
                title="Click to finalize this date"
              >
                <span className="overlap-chip-day">{DAY_SHORT[date.getDay()]}</span>
                <span className="overlap-chip-num">{date.getDate()}</span>
                <span className="overlap-chip-month">{SHORT_MONTH[date.getMonth()]}</span>
                <span className="overlap-chip-lock">Lock in →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Participant summary badges at top */}
      {room.participants.length > 0 && (
        <div className="participant-legend">
          <div className="section-label" style={{ width: '100%', marginBottom: '6px' }}>
            Submitted Availability ({room.participants.length})
          </div>
          {room.participants.map((p, i) => {
            const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]
            return (
              <div key={i} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: color.fill, boxShadow: `0 0 8px ${color.glow}` }}
                />
                <span className="legend-name">{p.name}</span>
                <span className="legend-count">{p.dates.length} days</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Add dates CTA form placed prominently at top */}
      <div className="room-add-cta" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p className="room-add-hint" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: 0 }}>
            Share Your Availability
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span className="section-label" style={{ fontSize: '11px' }}>Your Name</span>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="url-input"
              style={{ width: '100%', boxSizing: 'border-box', height: '42px', fontSize: '15px' }}
              aria-label="Your name"
            />
          </div>

          <button
            className="room-add-btn"
            onClick={handleAddDatesClick}
            id="add-my-dates-btn"
            style={{ width: '100%' }}
          >
            {currentUserParticipant ? 'Edit / Update my availability' : 'Add my availability'}
          </button>
        </div>
      </div>



      {/* Per-participant date lists below form */}
      {room.participants.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div className="section-label" style={{ marginBottom: '12px' }}>Participant Breakdown</div>
          {room.participants.map((p, pIdx) => {
            const color = PARTICIPANT_COLORS[pIdx % PARTICIPANT_COLORS.length]
            const dates = stringsToDate(p.dates).sort((a, b) => a.getTime() - b.getTime())

            const isSelf = (user && p.userId === user.uid) || (userName && p.name.toLowerCase() === userName.toLowerCase())

            // Group by month
            const byMonth = new Map<string, Date[]>()
            for (const d of dates) {
              const key = `${d.getFullYear()}-${d.getMonth()}`
              if (!byMonth.has(key)) byMonth.set(key, [])
              byMonth.get(key)!.push(d)
            }

            return (
              <div
                key={pIdx}
                className="participant-section"
                style={{ '--p-color': color.fill, '--p-soft': color.soft } as React.CSSProperties}
              >
                <div className="participant-section-header">
                  <span
                    className="participant-section-dot"
                    style={{ background: color.fill, boxShadow: `0 0 8px ${color.glow}` }}
                  />
                  <span className="participant-section-name">
                    {p.name} {isSelf && <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>(You)</span>}
                  </span>
                  <span className="participant-section-count" style={{ marginRight: '8px' }}>{dates.length} days</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleEditParticipantClick(p)}
                    style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
                    aria-label={`Edit ${p.name}'s dates`}
                  >
                    Edit
                  </button>
                </div>

                {Array.from(byMonth.entries()).map(([key, mDates]) => {
                  const [y, m] = key.split('-').map(Number)
                  const monthDates = mDates.map(date => {
                    const dateKey = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`
                    return {
                      date,
                      dateKey,
                      isOverlap: overlap.has(dateKey),
                      busyLabel: formatBusyRange(p.busyTimes?.[dateKey]),
                    }
                  })
                  const monthBusyEntries = monthDates.filter(item => item.busyLabel)

                  return (
                    <div key={key} className="participant-month-group">
                      <div className="participant-month-label">
                        {MONTH_NAMES[m]} {y}
                      </div>
                      <div className="participant-date-chips">
                        {monthDates.map(({ date, isOverlap, busyLabel }) => (
                          <Tooltip
                            key={date.toISOString()}
                            label={busyLabel ? `Not free ${busyLabel}` : ''}
                            disabled={!busyLabel}
                            withArrow
                            events={{ hover: true, focus: true, touch: true }}
                            position="top"
                            openDelay={150}
                            closeDelay={100}
                            withinPortal
                          >
                            <div
                              className={`participant-chip ${isOverlap ? 'is-overlap' : ''}`}
                              style={{
                                borderColor: isOverlap ? color.fill : 'var(--glass-border)',
                                background: isOverlap ? color.soft : 'var(--bg-card)',
                                color: isOverlap ? color.fill : 'var(--text-secondary)',
                              }}
                              title={!busyLabel && isOverlap ? 'Everyone is free!' : undefined}
                              tabIndex={busyLabel ? 0 : undefined}
                              aria-label={busyLabel ? `Not free ${busyLabel}` : undefined}
                            >
                              <span className="p-chip-day">{DAY_SHORT[date.getDay()]}</span>
                              <span className="p-chip-num" style={{ color: isOverlap ? color.fill : 'var(--text-primary)' }}>
                                {date.getDate()}
                              </span>
                              {busyLabel && <span className="p-chip-busy-dot" aria-hidden="true" />}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                      {monthBusyEntries.length > 0 && (
                        <div className="participant-busy-summary">
                          <span className="participant-busy-summary-label">Busy</span>
                          {monthBusyEntries.map(({ date, busyLabel }) => (
                            <span key={date.toISOString()} className="participant-busy-summary-item">
                              {SHORT_MONTH[date.getMonth()]} {date.getDate()} · {busyLabel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {dates.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                    Not available on any dates
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
        <button className="back-btn" onClick={onGoHome} id="room-home-btn" style={{ width: '100%', maxWidth: '240px' }}>
          Go to Home
        </button>
      </div>
    </div>
  )
}
