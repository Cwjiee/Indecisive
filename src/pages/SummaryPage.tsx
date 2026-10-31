import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRoomFromDb } from '../utils/db'
import { stringsToDate, getValidBusyTimes, pruneBusyTimes } from '../utils/room'
import { getStoredName, getStoredDates, getStoredBusyTimes } from '../utils/session'
import Summary from '../components/Summary'
import type { RoomData } from '../utils/room'

export default function SummaryPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const roomCode = code?.toUpperCase() ?? ''
  const isSolo = roomCode === 'SOLO'

  const userName = getStoredName() || 'You'
  const dateStrs = getStoredDates(roomCode)
  const dates = stringsToDate(dateStrs).sort((a, b) => a.getTime() - b.getTime())
  const busyTimes = useMemo(() => {
    const stored = getStoredBusyTimes(roomCode)
    return pruneBusyTimes(getValidBusyTimes(stored), getStoredDates(roomCode))
  }, [roomCode])

  const [existingRoom, setExistingRoom] = useState<RoomData | null>(null)
  const [loadingRoom, setLoadingRoom] = useState(!isSolo)

  useEffect(() => {
    if (isSolo) return
    getRoomFromDb(roomCode).then(room => {
      setExistingRoom(room)
      setLoadingRoom(false)
    }).catch(() => setLoadingRoom(false))
  }, [roomCode, isSolo])

  if (loadingRoom) {
    return (
      <div className="setup-card" style={{ alignItems: 'center', gap: '16px' }}>
        <div className="summary-emoji">⏳</div>
        <div className="section-label">Loading room…</div>
      </div>
    )
  }

  return (
    <Summary
      dates={dates}
      busyTimes={busyTimes}
      userName={userName}
      preRoomCode={isSolo ? null : roomCode}
      existingRoom={existingRoom}
      onBack={() => {
        if (isSolo) navigate('/')
        else navigate(`/pick/${roomCode}`)
      }}
      onGoHome={() => navigate('/')}
      onViewRoom={() => navigate(`/room/${roomCode}`)}
    />
  )
}
