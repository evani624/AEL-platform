import { useState } from 'react'
import { Check, Plus, Trash2, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import {
  GAME_SUGGESTIONS,
  CATEGORIES,
  TOURNAMENT_TYPES,
  BRACKET_SIZE_OPTIONS_BY_TYPE,
} from '../constants/games'

/**
 * Shared create/edit tournament form. Game is free text (datalist hints only),
 * category defaults to Mixed. Bracket size is fixed once created, so it is
 * disabled in edit mode.
 */
export default function TournamentFormModal({ mode, initial, isOpen, onClose, onSubmit, onDelete }) {
  const isEdit = mode === 'edit'
  const [name, setName] = useState(initial?.name || '')
  const [game, setGame] = useState(initial?.game || '')
  const [category, setCategory] = useState(initial?.category || 'mixed')
  const [tournamentType, setTournamentType] = useState(initial?.tournamentType || 'single')
  const [size, setSize] = useState(initial?.teamSize || 16)
  const [err, setErr] = useState({})

  const sizeOptions = BRACKET_SIZE_OPTIONS_BY_TYPE[tournamentType]

  if (!isOpen) return null

  const submit = () => {
    const next = {}
    if (name.trim().length < 3) next.name = 'Tournament needs a name (min 3 chars)'
    if (game.trim().length < 2) next.game = 'Enter the game being played'
    setErr(next)
    if (Object.keys(next).length) return
    onSubmit?.({ name: name.trim(), game: game.trim(), category, teamSize: size, tournamentType })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      accent={isEdit ? 'Editing tournament' : 'New competition'}
      title={isEdit ? 'Edit tournament' : 'Create tournament'}
      width={520}
      footer={
        <>
          {isEdit && (
            <button className="btn btn--danger btn--sm" style={{ marginRight: 'auto' }} onClick={onDelete}>
              <Trash2 size={13} />
              Delete
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary btn--sm" onClick={submit}>
            {isEdit ? <Check size={13} /> : <Plus size={13} />}
            {isEdit ? 'Save changes' : 'Create tournament'}
          </button>
        </>
      }
    >
      <div className={`field ${err.name ? 'field--err' : ''}`}>
        <label className="field__label">Tournament Name</label>
        <input
          className="field__input"
          placeholder="e.g. VCT Stage 2 — Championship"
          value={name}
          autoFocus={!isEdit}
          onChange={(e) => {
            setName(e.target.value)
            setErr((p) => ({ ...p, name: '' }))
          }}
        />
        {err.name && (
          <div className="field__err">
            <AlertCircle size={12} />
            {err.name}
          </div>
        )}
      </div>

      <div className={`field ${err.game ? 'field--err' : ''}`}>
        <label className="field__label">Game</label>
        <input
          className="field__input"
          placeholder="e.g. Valorant, EA FC 25, Rainbow Six…"
          value={game}
          list="game-suggestions"
          onChange={(e) => {
            setGame(e.target.value)
            setErr((p) => ({ ...p, game: '' }))
          }}
        />
        <datalist id="game-suggestions">
          {GAME_SUGGESTIONS.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        {err.game ? (
          <div className="field__err">
            <AlertCircle size={12} />
            {err.game}
          </div>
        ) : (
          <div className="field__hint">Type any game — this label shows on the bracket and public link.</div>
        )}
      </div>

      <div className="field">
        <label className="field__label">Category</label>
        <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`seg__btn ${category === c.id ? 'is-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="field__hint">Defaults to Mixed.</div>
      </div>

      <div className="field">
        <label className="field__label">Tournament Type</label>
        <div className="seg" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {TOURNAMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`seg__btn ${tournamentType === t.id ? 'is-active' : ''}`}
              disabled={isEdit}
              onClick={() => {
                if (isEdit) return
                setTournamentType(t.id)
                // Snap size if the current selection isn't valid for the new
                // type. Today this only triggers Single→Double with size=64.
                const valid = BRACKET_SIZE_OPTIONS_BY_TYPE[t.id]
                if (!valid.some((o) => o.value === size)) {
                  setSize(valid[valid.length - 1].value)
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="field__hint">
          {isEdit
            ? 'Tournament type is fixed once created.'
            : 'Double adds a Losers bracket + Grand Final (+ Reset).'}
        </div>
      </div>

      <div className="field">
        <label className="field__label">Bracket Size</label>
        <div className="seg" style={{ gridTemplateColumns: `repeat(${sizeOptions.length}, 1fr)` }}>
          {sizeOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`seg__btn ${size === o.value ? 'is-active' : ''}`}
              disabled={isEdit}
              onClick={() => !isEdit && setSize(o.value)}
            >
              {o.value}
            </button>
          ))}
        </div>
        <div className="field__hint">
          {tournamentType === 'double'
            ? `Double elimination · ${Math.log2(size)} W rounds + ${2 * Math.log2(size) - 2} L rounds · ${2 * size - 1} matches total`
            : `Single elimination · ${Math.log2(size)} rounds · ${size - 1} matches total`}
          {isEdit && (
            <span style={{ display: 'block', marginTop: 4 }}>Bracket size is fixed once a tournament is created.</span>
          )}
        </div>
      </div>
    </Modal>
  )
}
