import { useRef } from 'react'
import { sectionAfterSwipe } from '../../domain/sectionNavigation'

export default function useSectionSwipe(view, onSelect, { footer = false } = {}) {
  const start = useRef(null)
  const suppressClick = useRef(false)
  function begin(target, x, y) {
    start.current = null
    suppressClick.current = false
    if (!window.matchMedia('(max-width: 760px)').matches || document.querySelector('dialog[open], .loan-editor, .goal-editor, .ledger-editor, .investment-editor')) return
    if (footer) {
      if (target.closest('.mobile-account-trigger')) return
    } else {
      if (target.closest('button, input, select, textarea, a, nav, .account-menu, .loan-table-wrap, .ledger-table-wrap, .loan-list, .goal-list, .ledger-list, form')) return
      // Native horizontal lists/tables keep their own gestures.
      for (let el = target; el && el !== document.body; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return
      }
      if (x < 20 || x > window.innerWidth - 20) return // Preserve browser edge gestures.
    }
    start.current = { x, y }
  }
  function finish(x, y) {
    const from = start.current
    start.current = null
    if (!from) return
    const dx = x - from.x, dy = y - from.y
    if (Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.5) suppressClick.current = true
    const next = sectionAfterSwipe(view, dx, dy)
    if (next !== view) onSelect(next)
  }
  return {
    onTouchStart(event) {
      if (event.touches.length !== 1) { start.current = null; return }
      const touch = event.touches[0]
      begin(event.target, touch.clientX, touch.clientY)
    },
    onTouchEnd(event) {
      if (event.touches.length) { start.current = null; return }
      const touch = event.changedTouches[0]
      if (touch) finish(touch.clientX, touch.clientY)
    },
    onTouchCancel() { start.current = null },
    onPointerDown(event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      begin(event.target, event.clientX, event.clientY)
    },
    onPointerUp(event) { if (event.pointerType === 'mouse') finish(event.clientX, event.clientY) },
    onPointerCancel(event) { if (event.pointerType === 'mouse') start.current = null },
    onClickCapture(event) {
      if (suppressClick.current && event.detail !== 0) {
        event.preventDefault(); event.stopPropagation(); suppressClick.current = false
      }
    },
  }
}
