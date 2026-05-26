/**
 * Loading skeleton for the bracket — violet shimmer (Arena Eleague redesign).
 */
export default function BracketSkeleton() {
  return (
    <div>
      <div className="bracket-head">
        <div>
          <div className="skel" style={{ width: 280, height: 26 }} />
          <div className="skel" style={{ width: 180, height: 12, marginTop: 8 }} />
        </div>
        <div className="skel" style={{ width: 200, height: 14 }} />
      </div>
      <div className="bracket" style={{ position: 'relative' }}>
        {[0, 1, 2].map((c) => (
          <div className="round-col" key={c}>
            <div className="skel" style={{ width: 120, height: 12, margin: '0 auto 8px' }} />
            <div className="round-col__matches">
              {Array.from({ length: c === 0 ? 4 : c === 1 ? 2 : 1 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: 92, borderRadius: 14 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
