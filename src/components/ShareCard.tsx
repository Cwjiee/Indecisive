import { useState } from 'react'
import { TextInput } from '@mantine/core'
import {
  type RoomData,
  datesToStrings,
} from '../utils/room'
import {
  createRoomInDb,
  joinRoomInDb,
  buildDbShareUrl
} from '../utils/db'

interface ShareCardProps {
  myDates: Date[]
  existingRoom: RoomData | null
  /** Name collected on the setup page — pre-fills the input */
  defaultName?: string
  /** Room code generated on the setup page — reused here so it stays consistent */
  preRoomCode?: string | null
}

export default function ShareCard({ myDates, existingRoom, defaultName = '', preRoomCode }: ShareCardProps) {
  const [name, setName] = useState(defaultName)
  const [generated, setGenerated] = useState<{ url: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleGenerate = async () => {
    const displayName = name.trim() || (existingRoom ? 'Friend' : 'You')
    const serializedDates = datesToStrings(myDates)

    setIsSaving(true)
    try {
      let code: string
      if (existingRoom) {
        // Update database with new participant
        await joinRoomInDb(existingRoom.code, displayName, serializedDates)
        code = existingRoom.code
      } else {
        // Create database entry for new room
        code = await createRoomInDb(displayName, serializedDates, preRoomCode ?? null)
      }

      setGenerated({ url: buildDbShareUrl(code), code })
    } catch (e) {
      console.error("Error saving room data to Firestore:", e)
      alert("Failed to save your availability. Please try again.")
    } finally {
      setIsSaving(false)
    }
    setCopied(false)
  }

  const handleCopy = async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const inputStyles = {
    input: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--glass-border)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  }

  return (
    <div className="share-card">
      <div className="share-card-header">
        <span className="share-card-icon" aria-hidden="true">🔗</span>
        <div>
          <div className="share-card-title">
            {existingRoom ? 'Add yourself to the room' : 'Share your availability'}
          </div>
          <div className="share-card-sub">
            {existingRoom
              ? "Generate an updated link so everyone can see each other's availability"
              : 'Share with friends so they can add their own dates'}
          </div>
        </div>
      </div>

      <TextInput
        placeholder={existingRoom ? 'Your name' : 'Confirm your name (optional)'}
        value={name}
        onChange={e => setName(e.currentTarget.value)}
        size="sm"
        radius="md"
        styles={inputStyles}
        aria-label="Your name"
      />

      {!generated ? (
        <button
          className="generate-btn"
          onClick={handleGenerate}
          id="generate-room-btn"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : existingRoom ? 'Update room link →' : 'Generate room link →'}
        </button>
      ) : (
        <div className="generated-result">
          <div className="room-code-row">
            <span className="room-code-label">Room code</span>
            <span className="room-code-value">{generated.code}</span>
          </div>
          <div className="copy-url-row">
            <input
              className="url-input"
              value={generated.url}
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
          <button className="regenerate-btn" onClick={() => { setGenerated(null); setName(defaultName) }}>
            ↩ Change name
          </button>
        </div>
      )}
    </div>
  )
}
