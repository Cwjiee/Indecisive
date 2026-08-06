import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedRooms, getRoomFromDb } from '../utils/db'
import type { RoomData } from '../utils/room'

export default function HomePage() {
  const navigate = useNavigate()

  // Recent rooms
  const [recentRooms, setRecentRooms] = useState<RoomData[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  useEffect(() => {
    const codes = getSavedRooms()
    if (!codes.length) return
    setLoadingRooms(true)
    Promise.all(
      codes.map(code => getRoomFromDb(code).catch(() => null))
    ).then(results => {
      setRecentRooms(results.filter(Boolean) as RoomData[])
      setLoadingRooms(false)
    })
  }, [])

  return (
    <div className="home-choice-layout">
      {/* Choice cards */}
      <div className="choice-cards">
        <button
          className="choice-card choice-card--create"
          onClick={() => navigate('/create')}
          id="go-create-btn"
        >
          <span className="choice-card-icon" aria-hidden="true">📅</span>
          <div className="choice-card-body">
            <div className="choice-card-title">Create a hangout</div>
            <div className="choice-card-sub">
              Set up a shared room, invite friends, and find dates that work for everyone
            </div>
          </div>
          <span className="choice-card-arrow" aria-hidden="true">→</span>
        </button>

        <button
          className="choice-card choice-card--join"
          onClick={() => navigate('/join')}
          id="go-join-btn"
        >
          <span className="choice-card-icon" aria-hidden="true">🔗</span>
          <div className="choice-card-body">
            <div className="choice-card-title">Join a hangout</div>
            <div className="choice-card-sub">
              Got a code from a friend? Jump in and add your availability
            </div>
          </div>
          <span className="choice-card-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      {/* Recent hangouts */}
      {(loadingRooms || recentRooms.length > 0) && (
        <div className="rooms-panel home-recent-panel">
          <div className="rooms-panel-header">
            <span className="rooms-panel-icon" aria-hidden="true">🏠</span>
            <span className="rooms-panel-title">Recent Hangouts</span>
          </div>

          {loadingRooms ? (
            <div className="rooms-panel-empty">Loading…</div>
          ) : (
            <div className="rooms-list">
              {recentRooms.map(room => {
                const names = room.participants.map(p => p.name)
                const count = room.participants.length
                const displayName = room.name || room.code
                return (
                  <button
                    key={room.code}
                    className="room-list-item"
                    onClick={() => navigate(`/room/${room.code}`)}
                    aria-label={`Open hangout ${displayName}`}
                  >
                    <div className="room-list-item-top">
                      <span className="room-list-item-name">{displayName}</span>
                      <span className="room-list-item-code">{room.code}</span>
                    </div>
                    <div className="room-list-item-bottom">
                      <span className="room-list-item-people">
                        {count === 0
                          ? 'No participants yet'
                          : `👤 ${names.join(', ')}`}
                      </span>
                      <span className="room-list-item-count">
                        {count} {count === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
