import { Plus, Pencil, LogOut } from 'lucide-react'
import Logo from './Logo'
import { categoryLabel } from '../utils/bracketUtils'

export default function Navbar({
  mode,
  tournaments = [],
  currentId,
  matchCounts = { completed: 0, upcoming: 0 },
  onEditTournament,
  onAddTournament,
  onLogout,
}) {
  const cur = tournaments.find((t) => t.id === currentId) || tournaments[0]

  return (
    <nav className="nav">
      <Logo />
      <span className="nav__divider" />

      {/* Current tournament — static label (selection happens in the sidebar). */}
      {cur && (
        <div className="t-selector t-selector--static">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
            <span className="t-selector__game">
              {cur.game || 'Game'}
              <span className={`cat-chip cat-chip--${cur.category}`} style={{ marginLeft: 8 }}>
                {categoryLabel(cur.category)}
              </span>
            </span>
            <span className="t-selector__name">{cur.name}</span>
          </div>
        </div>
      )}

      {mode === 'admin' && cur && (
        <button className="icon-btn" onClick={() => onEditTournament?.(cur)} title="Edit tournament">
          <Pencil size={15} />
        </button>
      )}

      <span className="nav__divider" />
      {cur && (
        <div className="counter">
          <span className="counter__num">{matchCounts.completed}</span>
          <span className="counter__lbl">Done</span>
          <span className="counter__sep">/</span>
          <span className="counter__num">{matchCounts.upcoming}</span>
          <span className="counter__lbl">Upcoming</span>
        </div>
      )}

      <span className="nav__spacer" />

      {mode === 'admin' && (
        <>
          <button className="btn btn--primary btn--sm" onClick={onAddTournament}>
            <Plus size={14} />
            Add Tournament
          </button>
          <button className="icon-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </>
      )}
    </nav>
  )
}
