import { MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM } from '../../domain/canvasPins.js'
export { MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM }

export function clampCanvasZoom(value, minimum = MIN_CANVAS_ZOOM) {
  return Math.round(Math.min(MAX_CANVAS_ZOOM, Math.max(minimum, value)) * 1000) / 1000
}

// With a centered tree, a 40% margin on each edge leaves a 20% footprint.
// Both dimensions must retain that footprint; the limiting axis stops zoom-out.
export function minimumCanvasZoom(viewport, content) {
  if (viewport.width <= 0 || viewport.height <= 0 || content.width <= 0 || content.height <= 0) return MIN_CANVAS_ZOOM
  const minimum = Math.max(viewport.width * 0.2 / content.width, viewport.height * 0.2 / content.height)
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, Math.ceil(minimum * 1000) / 1000))
}

const touchDistance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
const touchCenter = touches => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 })

// Non-passive listeners keep gestures local to the canvas. Ordinary scrolling
// stays native; two-finger pinch and trackpad Ctrl+wheel change canvas zoom.
export function bindCanvasGestures(element, { enabled = true, isLocked, getZoom, onZoom }) {
  if (!enabled) return () => {}
  let distance = null
  let safariStartZoom = 1
  const wheel = event => {
    if (!event.ctrlKey) return
    event.preventDefault()
    if (isLocked()) return
    onZoom(clampCanvasZoom(getZoom() * Math.exp(-event.deltaY * 0.01)), { x: event.clientX, y: event.clientY })
  }
  const start = event => {
    distance = event.touches.length === 2 ? touchDistance(event.touches) : null
    if (distance !== null) event.preventDefault()
  }
  const move = event => {
    if (event.touches.length !== 2) { distance = null; return }
    event.preventDefault()
    if (isLocked()) return
    const next = touchDistance(event.touches)
    if (distance > 0) onZoom(clampCanvasZoom(getZoom() * next / distance), touchCenter(event.touches))
    distance = next
  }
  const end = () => { distance = null }
  const gestureStart = event => { event.preventDefault(); safariStartZoom = getZoom() }
  const gestureChange = event => {
    event.preventDefault()
    if (!isLocked() && distance === null) onZoom(clampCanvasZoom(safariStartZoom * event.scale), { x: event.clientX, y: event.clientY })
  }
  const handlers = { wheel, touchstart: start, touchmove: move, touchend: end, touchcancel: end, gesturestart: gestureStart, gesturechange: gestureChange }
  Object.entries(handlers).forEach(([name, handler]) => element.addEventListener(name, handler, { passive: false }))
  return () => Object.entries(handlers).forEach(([name, handler]) => element.removeEventListener(name, handler))
}
