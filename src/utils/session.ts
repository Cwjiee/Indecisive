// Shared sessionStorage helpers keyed by room code.
// Values survive page refresh but are cleared when the browser tab is closed.

const NAME_KEY = 'indecisive_user_name'

export function getStoredName(): string {
  return sessionStorage.getItem(NAME_KEY) || ''
}

export function setStoredName(name: string): void {
  sessionStorage.setItem(NAME_KEY, name)
}

export function getStoredDates(roomCode: string): string[] {
  const key = `indecisive_dates_${roomCode.toUpperCase()}`
  const raw = sessionStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function setStoredDates(roomCode: string, dateStrs: string[]): void {
  const key = `indecisive_dates_${roomCode.toUpperCase()}`
  sessionStorage.setItem(key, JSON.stringify(dateStrs))
}

export function clearStoredDates(roomCode: string): void {
  const key = `indecisive_dates_${roomCode.toUpperCase()}`
  sessionStorage.removeItem(key)
}
