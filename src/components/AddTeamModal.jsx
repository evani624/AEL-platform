import { useState, useRef, useEffect } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import { TEAM_COLORS } from '../constants/teamColors'

export default function AddTeamModal({ isOpen, onClose, onConfirm, slotLabel }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TEAM_COLORS[0].hex)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [])

  const submit = () => {
    if (name.trim().length < 2) {
      setErr('Team name needs at least 2 characters')
      return
    }
    onConfirm?.({ name: name.trim(), color })
    onClose?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      accent={slotLabel || 'Bracket slot'}
      title="Add a team"
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary btn--sm" onClick={submit}>
            <Check size={13} />
            Add team
          </button>
        </>
      }
    >
      <div className={`field ${err ? 'field--err' : ''}`}>
        <label className="field__label">Team Name</label>
        <input
          ref={inputRef}
          className="field__input"
          placeholder="e.g. Phoenix Rising"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErr('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {err ? (
          <div className="field__err">
            <AlertCircle size={12} />
            {err}
          </div>
        ) : (
          <div className="field__hint">Shown across the bracket and public link.</div>
        )}
      </div>

      <div className="field">
        <label className="field__label">Team Color</label>
        <div className="swatches">
          {TEAM_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`swatch ${c.hex === color ? 'is-active' : ''}`}
              style={{ '--c': c.hex }}
              onClick={() => setColor(c.hex)}
              aria-label={c.id}
            />
          ))}
        </div>
        <div className="field__hint">A subtle bar next to the name on every match card.</div>
      </div>

      <div
        style={{
          marginTop: 4,
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '.14em',
            color: 'var(--text-mute)',
            textTransform: 'uppercase',
          }}
        >
          Preview
        </span>
        <span className="team-chip" style={{ '--c': color }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {name.trim() || (
            <span style={{ color: 'var(--text-mute)', fontStyle: 'italic', fontWeight: 400 }}>Team name…</span>
          )}
        </span>
      </div>
    </Modal>
  )
}
