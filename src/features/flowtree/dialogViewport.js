// Keep phone dialogs inside the visible area when the keyboard reduces it.
export function bindDialogViewport(element, host = window) {
  const viewport = host.visualViewport
  let frame
  function update() {
    if (!host.matchMedia('(max-width: 760px)').matches) {
      element.style.removeProperty('--dialog-visible-height')
      element.style.removeProperty('--dialog-visible-top')
      return
    }
    element.style.setProperty('--dialog-visible-height', `${viewport?.height ?? host.innerHeight}px`)
    element.style.setProperty('--dialog-visible-top', `${viewport?.offsetTop ?? 0}px`)
  }
  function resize() {
    update()
    host.cancelAnimationFrame(frame)
    frame = host.requestAnimationFrame(() => {
      const focused = element.ownerDocument.activeElement
      if (host.matchMedia('(max-width: 760px)').matches && element.contains(focused) && focused.matches('input, select, textarea')) {
        const bounds = element.getBoundingClientRect()
        const field = focused.getBoundingClientRect()
        const actions = element.querySelector('form > .dialog-actions')?.getBoundingClientRect()
        const top = bounds.top + 12
        const bottom = Math.min(bounds.bottom - 12, actions?.top ?? bounds.bottom) - 12
        // Native scrollIntoView can consider a field visible even underneath
        // sticky actions. Scroll only this dialog, accounting for that footer.
        if (field.bottom > bottom) element.scrollTop += field.bottom - bottom
        else if (field.top < top) element.scrollTop -= top - field.top
      }
    })
  }
  update()
  element.addEventListener('focusin', resize)
  host.addEventListener('resize', resize)
  viewport?.addEventListener('resize', resize)
  viewport?.addEventListener('scroll', update)
  return () => {
    host.cancelAnimationFrame(frame)
    element.removeEventListener('focusin', resize)
    host.removeEventListener('resize', resize)
    viewport?.removeEventListener('resize', resize)
    viewport?.removeEventListener('scroll', update)
    element.style.removeProperty('--dialog-visible-height')
    element.style.removeProperty('--dialog-visible-top')
  }
}
