import { useLayoutEffect, useRef } from 'react'

const SCROLL_REGION = '.energy-viewport, .loans-view, .goals-view, .recurring-view, .ledger-view'

export function useSectionScroll(view) {
  const rootRef = useRef(null)

  useLayoutEffect(() => {
    const region = rootRef.current?.querySelector(SCROLL_REGION)
    if (!region) return undefined
    const key = `flowtree-scroll-${view}`
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key))
      if (Number.isFinite(saved?.top) && Number.isFinite(saved?.left)) {
        region.scrollTop = saved.top
        region.scrollLeft = saved.left
      }
    } catch {
      // Scroll restoration is optional when storage is unavailable.
    }
    const remember = () => {
      try {
        window.sessionStorage.setItem(key, JSON.stringify({ top: region.scrollTop, left: region.scrollLeft }))
      } catch {
        // Keep navigation usable even when browser storage is full.
      }
    }
    region.addEventListener('scroll', remember, { passive: true })
    return () => region.removeEventListener('scroll', remember)
  }, [view])

  return rootRef
}
