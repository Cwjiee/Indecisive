import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CalendarPicker from '../components/CalendarPicker'
import { stringsToDate, datesToStrings } from '../utils/room'
import { getStoredDates, setStoredDates } from '../utils/session'

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

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [weekendsOnly, setWeekendsOnly] = useState(false)

  // Persist dates to sessionStorage whenever they change
  const handleChangeDates = useCallback((dates: Date[]) => {
    setSelectedDates(dates)
    setStoredDates(roomCode, datesToStrings(dates))
  }, [roomCode])

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

  const handleContinue = () => {
    // Ensure the latest dates are written before navigating
    setStoredDates(roomCode, datesToStrings(selectedDates))
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
      onChangeSelectedDates={handleChangeDates}
      onClear={() => handleChangeDates([])}
      onContinue={handleContinue}
      onBack={handleBack}
    />
  )
}
