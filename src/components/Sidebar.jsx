import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Share2, Trash2, MoreVertical } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useDragScroll from '../hooks/useDragScroll'
import useClickOutside from '../hooks/useClickOutside'
import usePopoverPlacement from '../hooks/usePopoverPlacement'
import { categoryLabel, getTournamentStatus, getMatchCounts } from '../utils/bracketUtils'

const MENU_INITIAL_STYLE = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

function TournamentRow({ t, mode, currentId, onSelect, onDelete, onShare, dndDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
    disabled: dndDisabled,
  })
  const status = getTournamentStatus(t)
  const counts = getMatchCounts(t)
  const total = counts.completed + counts.upcoming

  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const menuRef = useRef(null)
  // Click-outside watches the trigger only; the portaled menu uses
  // mousedown stopPropagation so clicks inside it don't read as outside.
  useClickOutside(menuButtonRef, () => setMenuOpen(false))
  usePopoverPlacement(menuOpen, menuButtonRef, menuRef)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const closeAnd = (fn) => (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    fn?.()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`t-row ${t.id === currentId ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => onSelect?.(t.id)}
    >
      <div className="t-row__body">
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
          <span>
            {t.tournamentType === 'leaderboard'
              ? `${t.entries?.length ?? 0} teams`
              : `${t.teamSize} teams`}
          </span>
          <span>·</span>
          <span>
            {counts.completed}/{total}
          </span>
        </div>
      </div>

      {mode === 'admin' && (
        <>
          <button
            ref={menuButtonRef}
            type="button"
            className="t-row__menu"
            aria-label="More actions"
            aria-expanded={menuOpen}
            title="More actions"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
            // Keep the row's drag-handle pointer down from firing on this button.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen &&
            createPortal(
              <div
                ref={menuRef}
                className="picker-pop row-menu"
                style={MENU_INITIAL_STYLE}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button type="button" className="row-menu__item" onClick={closeAnd(() => onShare?.(t))}>
                  <Share2 size={13} />
                  Share link
                </button>
                <button
                  type="button"
                  className="row-menu__item row-menu__item--danger"
                  onClick={closeAnd(() => onDelete?.(t.id))}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  )
}

export default function Sidebar({
  mode,
  tournaments = [],
  currentId,
  collapsed,
  onSelect,
  onDelete,
  onShare,
  onReorder,
}) {
  const [q, setQ] = useState('')
  const filtered = tournaments.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
  const listRef = useRef(null)
  // Desktop list scrolls vertically; mobile scrolls horizontally — 'xy' covers both.
  // Ignore drag-scroll on the sortable rows so @dnd-kit's pointer events are clean.
  useDragScroll(listRef, { axis: 'xy', ignoreSelector: '.icon-btn, button, input, .t-row' })

  const dndEnabled = mode === 'admin' && !q
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(e) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = tournaments.map((t) => t.id)
    const oldIdx = ids.indexOf(active.id)
    const newIdx = ids.indexOf(over.id)
    if (oldIdx < 0 || newIdx < 0) return
    onReorder?.(arrayMove(ids, oldIdx, newIdx))
  }

  const rows = filtered.map((t) => (
    <TournamentRow
      key={t.id}
      t={t}
      mode={mode}
      currentId={currentId}
      onSelect={onSelect}
      onDelete={onDelete}
      onShare={onShare}
      dndDisabled={!dndEnabled}
    />
  ))

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
        {mode === 'admin' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {rows}
            </SortableContext>
          </DndContext>
        ) : (
          rows
        )}
        {filtered.length === 0 && (
          <div style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--text-mute)', fontSize: 12.5 }}>
            {tournaments.length === 0 ? 'No tournaments yet' : `No tournaments match "${q}"`}
          </div>
        )}
      </div>
    </aside>
  )
}
