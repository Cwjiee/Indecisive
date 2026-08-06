import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import RoomView from '../components/RoomView'
import { subscribeToRoom, saveRoomToHistory } from '../utils/db'
import type { RoomData } from '../utils/room'
import { setStoredName, setStoredDates } from '../utils/session'

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) return

    const upper = code.toUpperCase()
    saveRoomToHistory(upper)

    const unsubscribe = subscribeToRoom(
      upper,
      (roomData) => {
        if (roomData) {
          setRoom(roomData)
          setLoading(false)
        } else {
          setLoading(false)
          setNotFound(true)
        }
      },
      () => {
        setLoading(false)
        setNotFound(true)
      }
    )

    return () => unsubscribe()
  }, [code])

  if (loading) {
    return (
      <div className="setup-card" style={{ alignItems: 'center', gap: '16px' }}>
        <div className="summary-emoji">⏳</div>
        <div className="section-label">Loading room {code}…</div>
      </div>
    )
  }

  if (notFound || !room) {
    return (
      <div className="setup-card" style={{ alignItems: 'center', gap: '16px' }}>
        <div className="summary-emoji">🔍</div>
        <div className="share-card-title">Room not found</div>
        <div className="share-card-sub">
          The room code <strong>{code}</strong> doesn't exist in Firestore.
        </div>
        <button className="continue-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    )
  }

  const handleAddDates = () => {
    navigate(`/pick/${room.code}`)
  }

  const handleEditParticipant = (name: string, dateStrs: string[]) => {
    // Pre-populate the session for the picker
    setStoredName(name)
    setStoredDates(room.code, dateStrs)
    navigate(`/pick/${room.code}?user=${encodeURIComponent(name)}`)
  }

  return (
    <RoomView
      room={room}
      onAddDates={handleAddDates}
      onGoHome={() => navigate('/')}
      onEditParticipant={handleEditParticipant}
    />
  )
}
