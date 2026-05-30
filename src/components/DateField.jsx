import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Calendar, X } from 'lucide-react'
import useClickOutside from '../hooks/useClickOutside'
import usePopoverPlacement from '../hooks/usePopoverPlacement'

// Initial style for the portal-rendered popover. Hidden until the placement
// hook measures and writes the computed top/left + visibility.
const POP_INITIAL_STYLE = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

// "YYYY-MM-DD" -> local Date (DB stores DATE; we never deal with timezones).
function parseISODate(value) {
  if (!value) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}
function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function formatFriendly(date) {
  if (!date) return ''
  return date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function DateField({ value, onChange, label, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  // Click-outside watches the trigger only; the popover is portaled and uses
  // mousedown stopPropagation so a click inside it doesn't read as outside.
  useClickOutside(triggerRef, () => setOpen(false))
  usePopoverPlacement(open, triggerRef, popoverRef)

  const selected = parseISODate(value)

  const handleSelect = (date) => {
    if (date) {
      onChange(toISODate(date))
      setOpen(false)
    }
  }

  return (
    <div>
      {label && <label className="field__label">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        className={`picker-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Calendar size={14} style={{ color: 'var(--text-mute)', flexShrink: 0 }} />
        <span className={selected ? 'picker-trigger__val' : 'picker-trigger__placeholder'}>
          {selected ? formatFriendly(selected) : placeholder}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            className="picker-clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
              }
            }}
            aria-label="Clear date"
            title="Clear date"
          >
            <X size={12} />
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="picker-pop"
            style={POP_INITIAL_STYLE}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DayPicker mode="single" selected={selected} onSelect={handleSelect} showOutsideDays />
          </div>,
          document.body
        )}
    </div>
  )
}
