import { useState, useRef } from 'react'
import { Search, Pencil, Share2, Trash2 } from 'lucide-react'
import useDragScroll from '../hooks/useDragScroll'
import { categoryLabel, getTournamentStatus, getMatchCounts } from '../utils/bracketUtils'

export default function Sidebar({
  mode,
  tournaments = [],
  currentId,
  collapsed,
  onSelect,
  onEdit,
  onDelete,
  onShare,
}) {
  const [q, setQ] = useState('')
  const filtered = tournaments.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
  const listRef = useRef(null)
  // Desktop list scrolls vertically; mobile scrolls horizontally — 'xy' covers both.
  useDragScroll(listRef, { axis: 'xy', ignoreSelector: '.icon-btn, button, input' })

  return (
    <aside className={`sidebar sidebar--${mode} ${collapsed ? 'sidebar--collapsed' : ''}`} aria-hidden={collapsed}>
      <div className="sidebar__head">
        <span className="sidebar__title">Tournaments</span>
        <span className="sidebar__count">{tournaments.length}</span>
      </div>

      <label className="sidebar__search">
        <Search size={14} style={{ color: 'var(--text-mute)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'admin' ? 'Search tournaments…' : 'Find a tournament…'}
        />
      </label>

      <div ref={listRef} className="sidebar__list drag-scroll">
        {filtered.map((t) => {
          const status = getTournamentStatus(t)
          const counts = getMatchCounts(t)
          const total = counts.completed + counts.upcoming
          return (
            <div
              key={t.id}
              className={`t-row ${t.id === currentId ? 'is-active' : ''}`}
              onClick={() => onSelect?.(t.id)}
            >
              <div>
                <div className="t-row__name">
                  <span>{t.name}</span>
                  <span
                    className={`t-row__pill ${
                      status === 'live' ? 't-pill--live' : status === 'done' ? 't-pill--done' : 't-pill--soon'
                    }`}
                  >
                    {status === 'live' ? 'LIVE' : status === 'done' ? 'DONE' : 'SOON'}
                  </span>
                </div>
                <div className="t-row__meta">
                  <span>{t.game || '—'}</span>
                  <span>·</span>
                  <span className={`cat-chip cat-chip--${t.category} cat-chip--mini`}>{categoryLabel(t.category)}</span>
                  <span>·</span>
                  <span>{t.teamSize} teams</span>
                  <span>·</span>
                  <span>
                    {counts.completed}/{total}
                  </span>
                </div>
              </div>
              {mode === 'admin' && (
                <div className="t-row__actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title="Edit" onClick={() => onEdit?.(t)}>
                    <Pencil size={13} />
                  </button>
                  <button className="icon-btn" title="Share link" onClick={() => onShare?.(t)}>
                    <Share2 size={13} />
                  </button>
                  <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => onDelete?.(t.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--text-mute)', fontSize: 12.5 }}>
            {tournaments.length === 0 ? 'No tournaments yet' : `No tournaments match "${q}"`}
          </div>
        )}
      </div>
    </aside>
  )
}
