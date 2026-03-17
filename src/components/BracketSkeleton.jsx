/**
 * Loading skeleton for the bracket - Deep Indigo theme
 */
export default function BracketSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-electric-cyan/30 border-t-electric-cyan"
        style={{ animationDuration: '0.8s' }}
      />
      <p className="text-sm text-ice-white/60">Loading bracket...</p>
    </div>
  )
}
