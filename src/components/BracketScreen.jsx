import { useState, useRef } from 'react'
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Bracket from './Bracket'
import DoubleEliminationBracket from './DoubleEliminationBracket'
import LeaderboardScreen from './LeaderboardScreen'
import BracketAmbient from './BracketAmbient'
import BracketSkeleton from './BracketSkeleton'
import Logo from './Logo'
import useDragScroll from '../hooks/useDragScroll'
import { getMatchCounts, categoryLabel } from '../utils/bracketUtils'

function BracketHeader({ tournament }) {
  const counts = getMatchCounts(tournament)
  const total = counts.completed + counts.upcoming
  return (
    <div className="bracket-head">
      <div>
        <h2 className="bracket-head__title">
          <b>{tournament.name}</b>
        </h2>
        <div className="bracket-head__sub">
          <span>{tournament.game || '—'}</span>
          <span className="dot" />
          <span className={`cat-chip cat-chip--${tournament.category}`}>{categoryLabel(tournament.category)}</span>
          <span className="dot" />
          <span>
            {tournament.tournamentType === 'leaderboard'
              ? `${tournament.entries?.length ?? 0} teams · leaderboard`
              : `${tournament.teamSize}-team ${tournament.tournamentType === 'double' ? 'double' : 'single'} elim`}
          </span>
          <span className="dot" />
          <span>
            {tournament.tournamentType === 'leaderboard'
              ? `${counts.completed}/${total} teams scored`
              : `${counts.completed}/${total} matches recorded`}
          </span>
        </div>
      </div>
      <div className="bracket-legend">
        <span className="bracket-legend__item">
          <span className="bracket-legend__dot bracket-legend__dot--up" /> Soon
        </span>
        <span className="bracket-legend__item">
          <span className="bracket-legend__dot bracket-legend__dot--prog" /> In&nbsp;progress
        </span>
        <span className="bracket-legend__item">
          <span className="bracket-legend__dot bracket-legend__dot--done" /> Done
        </span>
      </div>
    </div>
  )
}

function EmptyState({ mode, onAdd }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
        minHeight: 400,
      }}
    >
      <div style={{ marginBottom: 18, opacity: 0.7 }}>
        <Logo withText={false} size="lg" />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>
        {mode === 'admin' ? 'No tournament selected' : 'Nothing here yet'}
      </h3>
      <p style={{ margin: '0 0 22px', color: 'var(--text-dim)', fontSize: 13, maxWidth: 320 }}>
        {mode === 'admin'
          ? 'Pick one on the left, or spin up a new bracket and start adding teams.'
          : 'The organizer hasn’t published a bracket yet. Check back soon.'}
      </p>
      {mode === 'admin' && (
        <button className="btn btn--primary btn--sm" onClick={onAdd}>
          <Plus size={13} /> New Tournament
        </button>
      )}
    </div>
  )
}

/**
 * Shared admin/public shell: aurora backdrop, navbar, collapsible sidebar,
 * drag-pannable bracket area. Overlays (modals, toasts) are passed as children.
 */
export default function BracketScreen({
  mode,
  tournaments = [],
  currentId,
  loading,
  onSelect,
  onAddTournament,
  onEditTournament,
  onDeleteTournament,
  onShare,
  onReorder,
  onSlotClick,
  onDeleteTeam,
  onLogout,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onSetFinal,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const bracketRef = useRef(null)
  useDragScroll(bracketRef, { axis: 'xy', ignoreSelector: '[data-match-id], button, input, a' })

  const current = tournaments.find((t) => t.id === currentId)
  const counts = current ? getMatchCounts(current) : { completed: 0, upcoming: 0 }

  return (
    <div className="screen">
      <div className="screen-bg" />
      <BracketAmbient />
      <Navbar
        mode={mode}
        tournaments={tournaments}
        currentId={currentId}
        matchCounts={counts}
        onSelect={onSelect}
        onEditTournament={onEditTournament}
        onAddTournament={onAddTournament}
        onLogout={onLogout}
      />
      <div className="layout">
        <Sidebar
          mode={mode}
          tournaments={tournaments}
          currentId={currentId}
          collapsed={collapsed}
          onSelect={onSelect}
          onEdit={onEditTournament}
          onDelete={onDeleteTournament}
          onShare={onShare}
          onReorder={onReorder}
        />
        <button
          className={`sidebar-reveal ${collapsed ? '' : 'sidebar-reveal--open'}`}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Show tournament list' : 'Hide tournament list'}
          aria-label={collapsed ? 'Show tournament list' : 'Hide tournament list'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <>
              <span className="sidebar-reveal__label">Show tournaments</span>
              <ChevronRight size={14} />
              <span className="sidebar-reveal__count">{tournaments.length}</span>
            </>
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
        <div ref={bracketRef} className="bracket-wrap drag-scroll">
          {loading ? (
            <BracketSkeleton />
          ) : current ? (
            <>
              <BracketHeader tournament={current} />
              {current.tournamentType === 'leaderboard' ? (
                <LeaderboardScreen
                  tournament={current}
                  isReadOnly={mode === 'public'}
                  onAddEntry={onAddEntry}
                  onUpdateEntry={onUpdateEntry}
                  onDeleteEntry={onDeleteEntry}
                  onSetFinal={onSetFinal}
                />
              ) : current.tournamentType === 'double' ? (
                <DoubleEliminationBracket
                  tournament={current}
                  isReadOnly={mode === 'public'}
                  onSlotClick={onSlotClick}
                  onDeleteTeam={onDeleteTeam}
                />
              ) : (
                <Bracket
                  tournament={current}
                  isReadOnly={mode === 'public'}
                  onSlotClick={onSlotClick}
                  onDeleteTeam={onDeleteTeam}
                  lastRoundIndex={current?.rounds?.length ? current.rounds.length - 1 : -1}
                />
              )}
            </>
          ) : (
            <EmptyState mode={mode} onAdd={onAddTournament} />
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
