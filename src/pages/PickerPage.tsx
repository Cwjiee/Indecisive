import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CalendarPicker from '../components/CalendarPicker'
import { stringsToDate, datesToStrings, pruneBusyTimes, type DateRange, type BusyTimes } from '../utils/room'
import { getRoomFromDb } from '../utils/db'
import { getStoredDates, setStoredDates, getStoredBusyTimes, setStoredBusyTimes } from '../utils/session'

export default function PickerPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const roomCode = code?.toUpperCase() ?? 'solo'

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()

  // Hydrate dates from sessionStorage (persists on refresh)
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    const strs = getStoredDates(roomCode)
    return stringsToDate(strs)
  })

  const [busyTimes, setBusyTimes] = useState<BusyTimes>(() => getStoredBusyTimes(roomCode))
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [weekendsOnly, setWeekendsOnly] = useState(false)
  const [noDatesAvailable, setNoDatesAvailable] = useState(() => selectedDates.length === 0)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)

  // Drop busy-time drafts for dates that are no longer selected, then persist to session.
  useEffect(() => {
    const dateStrs = datesToStrings(selectedDates)
    setBusyTimes(prev => pruneBusyTimes(prev, dateStrs))
  }, [selectedDates])

  useEffect(() => {
    setStoredBusyTimes(roomCode, busyTimes)
  }, [roomCode, busyTimes])

  useEffect(() => {
    if (roomCode === 'solo') return

    getRoomFromDb(roomCode).then(room => {
      const range = room?.dateRange ?? null
      setDateRange(range)

      if (range) {
        const rangeStart = stringsToDate([range.start])[0]
        const rangeEnd = stringsToDate([range.end])[0]
        const currentMonthStart = new Date(currentYear, currentMonth, 1)
        const rangeStartMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
        const rangeEndMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1)

        // Start users on the first constrained month instead of a month
        // where every day is disabled.
        if (currentMonthStart < rangeStartMonth || currentMonthStart > rangeEndMonth) {
          setCurrentYear(rangeStart.getFullYear())
          setCurrentMonth(rangeStart.getMonth())
        }

        const filtered = stringsToDate(getStoredDates(roomCode).filter(date => date >= range.start && date <= range.end))
        setSelectedDates(filtered)
        setStoredDates(roomCode, datesToStrings(filtered))
        if (filtered.length === 0) setNoDatesAvailable(true)
      }
    }).catch(error => {
      console.error('Error loading room date range:', error)
    })
  }, [roomCode])

  const isDateInRange = useCallback((date: Date) => {
    if (!dateRange) return true
    const dateString = datesToStrings([date])[0]
    return dateString >= dateRange.start && dateString <= dateRange.end
  }, [dateRange])

  // Persist dates to sessionStorage whenever they change
  const handleChangeDates = useCallback((dates: Date[]) => {
    const filtered = dates.filter(isDateInRange)
    setSelectedDates(filtered)
    if (filtered.length > 0) setNoDatesAvailable(false)
    setStoredDates(roomCode, datesToStrings(filtered))
  }, [roomCode, isDateInRange])

  const handleToggleNoDatesAvailable = useCallback(() => {
    setNoDatesAvailable(prev => {
      const next = !prev
      if (next) handleChangeDates([])
      return next
    })
  }, [handleChangeDates])

  const prevMonth = useCallback(() => {
    // Don't allow navigating before the current month
    const isAtCurrentMonth = currentYear === todayYear && currentMonth === todayMonth
    if (isAtCurrentMonth) return
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }, [currentMonth, currentYear, todayYear, todayMonth])

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }, [currentMonth])

  const handleChangeBusyTime = useCallback((date: string, field: 'start' | 'end', time: string) => {
    setBusyTimes(prev => {
      const current = prev[date] ?? { start: '', end: '' }
      const nextRange = { ...current, [field]: time }

      if (!nextRange.start && !nextRange.end) {
        const next = { ...prev }
        delete next[date]
        return next
      }

      return { ...prev, [date]: nextRange }
    })
  }, [])

  const handleContinue = () => {
    // Ensure the latest dates and busy times are written before navigating
    const dateStrs = datesToStrings(selectedDates)
    setStoredDates(roomCode, dateStrs)
    setStoredBusyTimes(roomCode, pruneBusyTimes(busyTimes, dateStrs))
    if (roomCode === 'solo') {
      navigate('/summary/solo')
    } else {
      navigate(`/summary/${roomCode}`)
    }
  }

  const handleBack = () => {
    if (roomCode === 'solo') {
      navigate('/')
    } else {
      navigate(`/room/${roomCode}`)
    }
  }

  const handleToggleWeekendsOnly = useCallback(() => {
    setWeekendsOnly(prev => {
      const next = !prev
      if (next) {
        // Filter out any non-weekend dates already selected
        const filtered = selectedDates.filter(d => {
          const dow = d.getDay()
          return dow === 0 || dow === 6
        })
        handleChangeDates(filtered)
      }
      return next
    })
  }, [selectedDates, handleChangeDates])

  return (
    <CalendarPicker
      year={currentYear}
      month={currentMonth}
      weekendsOnly={weekendsOnly}
      selectedDates={selectedDates}
      today={today}
      isPrevMonthDisabled={currentYear === todayYear && currentMonth === todayMonth}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      onToggleWeekendsOnly={handleToggleWeekendsOnly}
      noDatesAvailable={noDatesAvailable}
      dateRange={dateRange}
      busyTimes={busyTimes}
      onToggleNoDatesAvailable={handleToggleNoDatesAvailable}
      onChangeSelectedDates={handleChangeDates}
      onChangeBusyTime={handleChangeBusyTime}
      onClear={() => {
        setNoDatesAvailable(true)
        handleChangeDates([])
      }}
      onContinue={handleContinue}
      onBack={handleBack}
    />
  )
}
