/** Compact date serialization: YYYYMMDD strings */
export function datesToStrings(dates: Date[]): string[] {
  return dates.map(d => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  })
}

export function stringsToDate(strs: string[]): Date[] {
  return strs.map(s => {
    const y = parseInt(s.slice(0, 4), 10)
    const m = parseInt(s.slice(4, 6), 10) - 1
    const d = parseInt(s.slice(6, 8), 10)
    return new Date(y, m, d)
  })
}

// ── Room data types ───────────────────────────────────────────────────────────

export interface Participant {
  userId?: string
  userEmail?: string
  name: string
  dates: string[] // YYYYMMDD
}

export interface DateRange {
  start: string // YYYYMMDD
  end: string   // YYYYMMDD
}

export interface RoomData {
  code: string          // 6-char readable code, e.g. "K3M9PX"
  name?: string         // optional human-readable room name e.g. "Summer BBQ"
  creatorId?: string
  participants: Participant[]
  dateRange?: DateRange // optional room-wide availability constraint
  finalDate?: string    // optional YYYYMMDD string for finalized hangout date
}

// ── Encoding / decoding ───────────────────────────────────────────────────────

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(str: string): string {
  const padded = str + '=='.slice((str.length + 3) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export function encodeRoom(data: RoomData): string {
  return toBase64Url(JSON.stringify(data))
}

export function decodeRoom(encoded: string): RoomData | null {
  try {
    return JSON.parse(fromBase64Url(encoded)) as RoomData
  } catch {
    return null
  }
}

// ── URL helpers ───────────────────────────────────────────────────────────────

export function buildShareUrl(data: RoomData): string {
  return `http://localhost:5173/room/${data.code}`
}

export function parseUrlRoom(): RoomData | null {
  const params = new URLSearchParams(window.location.search)
  const r = params.get('r')
  return r ? decodeRoom(r) : null
}

/** Clear the room query param without reloading the page. */
export function clearUrlRoom(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('r')
  window.history.replaceState(null, '', url.toString())
}

// ── Room code generation ──────────────────────────────────────────────────────

/** Generates a 6-char uppercase alphanumeric code. */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── Participant helpers ───────────────────────────────────────────────────────

/** Colours cycling per participant index. */
export const PARTICIPANT_COLORS = [
  { label: 'sage',     fill: '#5a8a5a', soft: 'rgba(90,138,90,0.12)',   glow: 'rgba(90,138,90,0.3)'   },
  { label: 'rose',     fill: '#b05a6a', soft: 'rgba(176,90,106,0.12)',  glow: 'rgba(176,90,106,0.3)'  },
  { label: 'terracotta', fill: '#c07a2a', soft: 'rgba(192,122,42,0.12)', glow: 'rgba(192,122,42,0.3)' },
  { label: 'slate',    fill: '#4a7a9a', soft: 'rgba(74,122,154,0.12)',  glow: 'rgba(74,122,154,0.3)'  },
  { label: 'gold',     fill: '#8b7a3c', soft: 'rgba(139,122,60,0.12)',  glow: 'rgba(139,122,60,0.3)'  },
]

/**
 * Returns the set of YYYYMMDD strings that appear in ALL participants' date arrays.
 */
export function getOverlapDates(participants: Participant[]): Set<string> {
  if (participants.length < 2) return new Set()
  const sets = participants.map(p => new Set(p.dates))
  const [first, ...rest] = sets
  const overlap = new Set<string>()
  for (const d of first) {
    if (rest.every(s => s.has(d))) overlap.add(d)
  }
  return overlap
}
