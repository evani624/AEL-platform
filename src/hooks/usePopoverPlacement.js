import { useLayoutEffect } from 'react'

const MARGIN = 12 // min distance from any viewport edge
const GAP = 6 // gap between trigger and popover

/**
 * Open-aware placement for a portal-rendered popover.
 *
 * The popover is rendered via createPortal to document.body and positioned
 * with `position: fixed` so it can never be clipped by the modal's overflow
 * (the source of the previous scroll-into-popover / phantom horizontal
 * scrollbar bug). The hook measures the popover's natural size and the
 * trigger's viewport position, then picks the first placement that fits:
 *
 *   1. BELOW the trigger
 *   2. ABOVE the trigger
 *   3. To the SIDE (right or left, whichever has more room)
 *   4. Catch-all: clamp into the viewport with a small margin.
 *
 * Recomputes on resize, orientationchange, and ancestor scroll. Writes
 * `top`/`left`/`visibility` directly on the popover node — no setState in
 * the effect body, so the rule against synchronous setState is satisfied
 * and the first paint already shows the popover in its final position.
 */
export default function usePopoverPlacement(open, triggerRef, popoverRef) {
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const pop = popoverRef.current
    if (!trigger || !pop) return

    function compute() {
      const t = trigger.getBoundingClientRect()
      const pw = pop.offsetWidth
      const ph = pop.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight

      const spaceBelow = vh - t.bottom - MARGIN - GAP
      const spaceAbove = t.top - MARGIN - GAP
      const spaceRight = vw - t.right - MARGIN - GAP
      const spaceLeft = t.left - MARGIN - GAP

      let top
      let left

      if (ph <= spaceBelow) {
        // 1. Below
        top = t.bottom + GAP
        left = t.left
      } else if (ph <= spaceAbove) {
        // 2. Above
        top = t.top - ph - GAP
        left = t.left
      } else if (pw <= Math.max(spaceRight, spaceLeft)) {
        // 3. Side — pick whichever side has more room.
        left = spaceRight >= spaceLeft ? t.right + GAP : t.left - pw - GAP
        top = t.top
      } else {
        // 4. Nothing fits cleanly — default near trigger; clamping does the rest.
        top = t.bottom + GAP
        left = t.left
      }

      // Clamp fully into the viewport with the safety margin.
      if (left + pw > vw - MARGIN) left = vw - pw - MARGIN
      if (left < MARGIN) left = MARGIN
      if (top + ph > vh - MARGIN) top = vh - ph - MARGIN
      if (top < MARGIN) top = MARGIN

      pop.style.top = `${Math.round(top)}px`
      pop.style.left = `${Math.round(left)}px`
      pop.style.visibility = 'visible'
    }

    compute()

    const onChange = () => compute()
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    // Capture-phase so we hear scroll on any ancestor (the modal scrolls too).
    window.addEventListener('scroll', onChange, true)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
      window.removeEventListener('scroll', onChange, true)
    }
  }, [open, triggerRef, popoverRef])
}
