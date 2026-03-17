import BracketSkeleton from './BracketSkeleton'

/**
 * Full app loading skeleton - preserves layout, Deep Indigo theme
 */
export default function AppSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar skeleton */}
      <nav
        className="flex h-16 items-center gap-6 px-6"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 23, 33, 0.95), rgba(42, 49, 66, 0.95))',
          borderBottom: '1px solid rgba(0, 245, 255, 0.2)',
        }}
      >
        <div className="h-8 w-32 animate-pulse rounded bg-electric-cyan/10" />
        <div className="h-10 flex-1 max-w-md animate-pulse rounded-lg bg-electric-cyan/10" />
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside
          className="flex w-80 shrink-0 flex-col"
          style={{
            background: 'rgba(31, 38, 51, 0.4)',
            borderRight: '1px solid rgba(0, 245, 255, 0.2)',
          }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(0, 245, 255, 0.2)' }}>
            <div className="h-4 w-24 animate-pulse rounded bg-electric-cyan/10" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-electric-cyan/10" />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex flex-1 items-center justify-center overflow-hidden">
          <BracketSkeleton />
        </main>
      </div>
    </div>
  )
}
