import { useLayoutEffect, useRef } from 'react'
import { MOBILE_SECTIONS } from '../../domain/sectionNavigation.js'

export function animateSectionChange(root, previous, next, host = window) {
  if (!root || previous === next || !host.matchMedia('(max-width: 760px)').matches || host.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const from = MOBILE_SECTIONS.findIndex(section => section.id === previous)
  const to = MOBILE_SECTIONS.findIndex(section => section.id === next)
  if (from < 0 || to < 0) return () => {}
  const offset = to > from ? 64 : -64
  const animations = [...root.querySelectorAll('.energy-viewport, .loans-view, .goals-view, .recurring-view, .ledger-view, .sinking-status')]
    .filter(element => typeof element.animate === 'function')
    .map(element => element.animate([
      { transform: `translateX(${offset}px)`, opacity: .35 },
      { transform: 'translateX(0)', opacity: 1 },
    ], { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' }))
  return () => animations.forEach(animation => animation.cancel())
}

export default function useSectionTransition(rootRef, view) {
  const previous = useRef(view)
  useLayoutEffect(() => {
    const cleanup = animateSectionChange(rootRef.current, previous.current, view)
    previous.current = view
    return cleanup
  }, [rootRef, view])
}
