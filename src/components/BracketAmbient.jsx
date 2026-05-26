import { useEffect, useRef, useState, useMemo } from 'react'

// Decide how much ambient motion to render. Reduced-motion users get a static
// backdrop; small screens get a lighter one; everyone else gets the full look.
function computeMode() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'full'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced'
  if (window.matchMedia('(max-width: 768px)').matches) return 'lite'
  return 'full'
}

/**
 * Calm aurora blobs + a few drifting particles behind the bracket. Kept cheap:
 * fewer/smaller blurred layers, transform-only drift, and animation paused when
 * the tab is hidden or the user is dragging the bracket.
 */
export default function BracketAmbient() {
  const ref = useRef(null)
  const [mode, setMode] = useState(computeMode)

  useEffect(() => {
    if (!window.matchMedia) return
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqSmall = window.matchMedia('(max-width: 768px)')
    const update = () => setMode(mqMotion.matches ? 'reduced' : mqSmall.matches ? 'lite' : 'full')
    mqMotion.addEventListener('change', update)
    mqSmall.addEventListener('change', update)
    return () => {
      mqMotion.removeEventListener('change', update)
      mqSmall.removeEventListener('change', update)
    }
  }, [])

  // Pause all ambient animation while the tab is in the background.
  useEffect(() => {
    const onVis = () => {
      const el = ref.current
      if (el) el.classList.toggle('screen-ambient--paused', document.hidden)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const particles = useMemo(
    () => [
      { x: 14, size: 2.5, dur: 46, delay: 0 },
      { x: 36, size: 3, dur: 54, delay: 12 },
      { x: 58, size: 2, dur: 50, delay: 26 },
      { x: 80, size: 2.5, dur: 58, delay: 6 },
      { x: 93, size: 2, dur: 52, delay: 18 },
    ],
    []
  )

  if (mode === 'reduced') {
    return (
      <div className="screen-ambient screen-ambient--static" aria-hidden="true">
        <div className="aurora aurora--1" />
        <div className="aurora aurora--2" />
      </div>
    )
  }

  return (
    <div ref={ref} className="screen-ambient" aria-hidden="true">
      <div className="aurora aurora--1" />
      <div className="aurora aurora--2" />
      {mode === 'full' && <div className="aurora aurora--cyan" />}
      {mode === 'full' && (
        <div className="particles">
          {particles.map((p, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${p.x}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
