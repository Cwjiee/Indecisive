import { useRef, useEffect } from 'react'
import { DatePicker } from '@mantine/dates'
import { Switch } from '@mantine/core'
import dayjs, { type Dayjs } from 'dayjs'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface CalendarPickerProps {
  year: number
  month: number
  weekendsOnly: boolean
  selectedDates: Date[]
  today: Date
  isPrevMonthDisabled?: boolean
  onPrevMonth: () => void
  onNextMonth: () => void
  onToggleWeekendsOnly: () => void
  onChangeSelectedDates: (dates: Date[]) => void
  onClear: () => void
  onContinue: () => void
  onBack?: () => void
}

export default function CalendarPicker({
  year, month, weekendsOnly, selectedDates, today,
  isPrevMonthDisabled,
  onPrevMonth, onNextMonth, onToggleWeekendsOnly,
  onChangeSelectedDates, onClear, onContinue, onBack,
}: CalendarPickerProps) {
  const count = selectedDates.length

  // Drag selection state
  const isDragging = useRef(false)
  const dragMode = useRef<'select' | 'deselect' | null>(null)
  const initialSelectedSet = useRef<Set<string>>(new Set())

  // Keep a fresh ref of current selected dates for mouse handlers
  const selectedDatesRef = useRef(selectedDates)
  selectedDatesRef.current = selectedDates

  const dateToKey = (d: Date | Dayjs) => dayjs(d).format('YYYY-MM-DD')

  // Global mouseup listener to end drag even if mouse released outside calendar
  useEffect(() => {
    const handleMouseUp = () => {
      isDragging.current = false
      dragMode.current = null
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // DatePicker passes dayjs objects internally — normalise to native Date[] first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (dates: any) => {
    const native = (dates as Date[]).map(d => dayjs(d).toDate())
    if (weekendsOnly) {
      onChangeSelectedDates(native.filter(d => { const dow = dayjs(d).day(); return dow === 0 || dow === 6 }))
    } else {
      onChangeSelectedDates(native)
    }
  }

  const handleDateMouseDown = (d: Dayjs, isDisabled: boolean) => {
    if (isDisabled) return
    isDragging.current = true

    const key = dateToKey(d)
    const currentSet = new Set(selectedDatesRef.current.map(dateToKey))
    initialSelectedSet.current = new Set(currentSet)

    const isAlreadySelected = currentSet.has(key)
    dragMode.current = isAlreadySelected ? 'deselect' : 'select'
  }

  const handleDateMouseEnter = (d: Dayjs, isDisabled: boolean) => {
    if (!isDragging.current || !dragMode.current || isDisabled) return

    const targetKey = dateToKey(d)
    const isCurrentlySelected = selectedDatesRef.current.some(sd => dateToKey(sd) === targetKey)

    if (dragMode.current === 'select' && !isCurrentlySelected) {
      const newDates = [...selectedDatesRef.current, d.toDate()]
      onChangeSelectedDates(newDates)
    } else if (dragMode.current === 'deselect' && isCurrentlySelected) {
      const newDates = selectedDatesRef.current.filter(sd => dateToKey(sd) !== targetKey)
      onChangeSelectedDates(newDates)
    }
  }

  /**
   * getDayProps is called with dayjs objects by Mantine internally.
   * We accept both and coerce via dayjs().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDayProps = (date: any) => {
    const d = dayjs(date as Date | Dayjs)
    const dow = d.day()
    const isWeekend = dow === 0 || dow === 6
    const isDisabled = weekendsOnly && !isWeekend
    const isToday = d.isSame(dayjs(today), 'day')
    const isSelected = selectedDates.some(sd => dayjs(sd).isSame(d, 'day'))

    const style: React.CSSProperties = {
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: isSelected ? 700 : 500,
      border: `1px solid ${
        isSelected ? '#5a8a5a' : isToday ? '#b07d4a' : 'transparent'
      }`,
      background: isSelected ? 'rgba(90,138,90,0.1)' : 'transparent',
      color: isSelected
        ? '#5a8a5a'
        : isToday
        ? '#8b5e3c'
        : isWeekend && !isDisabled
        ? '#c07a2a'
        : '#2c1e0f',
      boxShadow: isSelected ? '0 0 12px rgba(90,138,90,0.25)' : 'none',
      opacity: isDisabled ? 0.35 : 1,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      userSelect: 'none',
    }

    return {
      disabled: isDisabled,
      style,
      onMouseDown: () => handleDateMouseDown(d, isDisabled),
      onMouseEnter: () => handleDateMouseEnter(d, isDisabled),
    }
  }

  const displayMonth = new Date(year, month, 1)

  return (
    <div className="main-card">
      {/* Month selector */}
      <div className="section-label">Select a month</div>
      <div className="month-selector-row">
        <button
          className="month-nav-btn"
          onClick={onPrevMonth}
          aria-label="Previous month"
          disabled={isPrevMonthDisabled}
          style={{ opacity: isPrevMonthDisabled ? 0.3 : 1, cursor: isPrevMonthDisabled ? 'not-allowed' : 'pointer' }}
        >‹</button>
        <div className="month-display" aria-live="polite">{MONTH_NAMES[month]} {year}</div>
        <button className="month-nav-btn" onClick={onNextMonth} aria-label="Next month">›</button>
      </div>

      {/* Weekends-only toggle */}
      <div
        className="weekends-toggle-row"
        onClick={onToggleWeekendsOnly}
        role="switch"
        aria-checked={weekendsOnly}
        tabIndex={0}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onToggleWeekendsOnly() }}
        id="weekends-toggle"
      >
        <div className="toggle-info">
          <span className="toggle-title">Weekends only</span>
          <span className="toggle-sub">
            {weekendsOnly ? 'Only Sat & Sun are selectable' : 'All days enabled'}
          </span>
        </div>
        <Switch
          checked={weekendsOnly}
          onChange={onToggleWeekendsOnly}
          size="md"
          aria-label="Toggle weekends only"
          styles={{
            root: {
              pointerEvents: 'none',
            },
            track: {
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              backgroundColor: weekendsOnly ? 'var(--accent-weekend)' : 'var(--bg-primary)',
              borderColor: weekendsOnly ? 'transparent' : 'var(--glass-border)',
              boxShadow: weekendsOnly ? '0 0 14px rgba(192,122,42,0.4)' : 'none',
            },
            thumb: {
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            },
          }}
        />
      </div>

      {/* DatePicker — handles selection state + click wiring internally */}
      <DatePicker
        key={`${year}-${month}`}
        type="multiple"
        value={selectedDates}
        onChange={handleChange}
        date={displayMonth}
        getDayProps={getDayProps}
        hideOutsideDates
        firstDayOfWeek={0}
        size="sm"
        withCellSpacing={false}
        styles={{
          calendarHeader: { display: 'none' },
          month: { width: '100%', userSelect: 'none' },
          monthRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          },
          weekdaysRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '4px',
          },
          weekday: {
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: '#b09878',
            padding: '6px 0',
          },
        }}
      />

      {/* Action bar */}
      <div className="action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button className="back-btn" onClick={onBack} aria-label="Go back" style={{ marginRight: 4 }}>
              ←
            </button>
          )}
          <div className={`count-pill ${count === 0 ? 'empty' : ''}`}>
            <span className="count-badge">{count}</span>
            <span>{count === 1 ? 'date' : 'dates'} picked</span>
          </div>
          {count > 0 && (
            <button className="clear-btn" onClick={onClear} aria-label="Clear all selected dates">
              Clear
            </button>
          )}
        </div>
        <button
          className="continue-btn"
          onClick={onContinue}
          disabled={count === 0}
          id="continue-btn"
        >
          See summary <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}
