import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'
import useClickOutside from '../hooks/useClickOutside'
import usePopoverPlacement from '../hooks/usePopoverPlacement'

const POP_INITIAL_STYLE = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

const pad = (n) => String(n).padStart(2, '0')

function parseTime(value) {
  if (!value) return { h: null, m: null }
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value))
  if (!m) return { h: null, m: null }
  return { h: Number(m[1]), m: Number(m[2]) }
}
function formatFriendly(h, m) {
  if (h == null || m == null) return ''
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${pad(m)} ${period}`
}

function Column({ items, selected, onPick, format }) {
  const listRef = useRef(null)
  useEffect(() => {
    if (!listRef.current) return
    const sel = listRef.current.querySelector(`[data-val="${selected}"]`)
    if (sel) {
      listRef.current.scrollTop = sel.offsetTop - listRef.current.clientHeight / 2 + sel.clientHeight / 2
    }
  }, [selected])
  return (
    <div ref={listRef} className="picker-time__list">
      {items.map((v) => (
        <button
          key={v}
          type="button"
          data-val={v}
          className={`picker-time__opt ${v === selected ? 'is-active' : ''}`}
          onClick={() => onPick(v)}
        >
          {format(v)}
        </button>
      ))}
    </div>
  )
}

export default function TimeField({ value, onChange, label, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  useClickOutside(triggerRef, () => setOpen(false))
  usePopoverPlacement(open, triggerRef, popoverRef)
  const { h, m } = parseTime(value)
  const h12 = h == null ? null : ((h + 11) % 12) + 1
  const isPM = h != null && h >= 12

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5) // step 5

  const apply = (h12new, mNew, pmNew) => {
    const h24 = h12new === 12 ? (pmNew ? 12 : 0) : pmNew ? h12new + 12 : h12new
    onChange(`${pad(h24)}:${pad(mNew)}`)
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
        <Clock size={14} style={{ color: 'var(--text-mute)', flexShrink: 0 }} />
        <span className={h != null ? 'picker-trigger__val' : 'picker-trigger__placeholder'}>
          {h != null ? formatFriendly(h, m) : placeholder}
        </span>
        {h != null && (
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
            aria-label="Clear time"
            title="Clear time"
          >
            <X size={12} />
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="picker-pop picker-pop--time"
            style={POP_INITIAL_STYLE}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="picker-time">
              <div className="picker-time__col">
                <div className="picker-time__lbl">HR</div>
                <Column items={hours} selected={h12 ?? 12} onPick={(v) => apply(v, m ?? 0, isPM)} format={String} />
              </div>
              <div className="picker-time__col">
                <div className="picker-time__lbl">MIN</div>
                <Column items={minutes} selected={m ?? 0} onPick={(v) => apply(h12 ?? 12, v, isPM)} format={pad} />
              </div>
              <div className="picker-time__ampm">
                <button
                  type="button"
                  className={!isPM ? 'is-active' : ''}
                  onClick={() => apply(h12 ?? 12, m ?? 0, false)}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={isPM ? 'is-active' : ''}
                  onClick={() => apply(h12 ?? 12, m ?? 0, true)}
                >
                  PM
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
