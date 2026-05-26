import BracketSkeleton from './BracketSkeleton'
import Logo from './Logo'

/**
 * Full-screen loading skeleton — preserves the new layout while data /
 * session checks resolve.
 */
export default function AppSkeleton() {
  return (
    <div className="screen">
      <div className="screen-bg" />
      <nav className="nav">
        <Logo />
        <span className="nav__divider" />
        <div className="skel" style={{ width: 220, height: 36, borderRadius: 10 }} />
        <span className="nav__spacer" />
        <div className="skel" style={{ width: 150, height: 34, borderRadius: 10 }} />
      </nav>
      <div className="layout">
        <aside className="sidebar sidebar--admin">
          <div className="sidebar__head">
            <span className="sidebar__title">Tournaments</span>
          </div>
          <div className="sidebar__list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skel" style={{ height: 56, borderRadius: 10, margin: '8px 4px' }} />
            ))}
          </div>
        </aside>
        <div className="bracket-wrap">
          <BracketSkeleton />
        </div>
      </div>
    </div>
  )
}
