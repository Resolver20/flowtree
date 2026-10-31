import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { bindCanvasGestures, clampCanvasZoom, minimumCanvasZoom, MIN_CANVAS_ZOOM } from './canvasGestures'

export function useCanvasControls(viewportRef, view, pin, onPinChange, enabled = true) {
  const [camera, setCamera] = useState(() => ({ view, zoom: pin?.zoom || 1 }))
  const zoom = enabled ? pin?.zoom ?? (camera.view === view ? camera.zoom : 1) : 1
  const locked = enabled && Boolean(pin)
  const [minZoom, setMinZoom] = useState(MIN_CANVAS_ZOOM)
  const live = useRef({ zoom: pin?.zoom || 1, locked, minZoom: MIN_CANVAS_ZOOM })
  const anchor = useRef(null)
  const restoredCamera = useRef(null)
  const isLocked = useCallback(() => live.current.locked, [])

  const changeZoom = useCallback((value, point) => {
    const viewport = viewportRef.current
    const content = viewport?.querySelector('.tree-zoom-layer')
    const next = clampCanvasZoom(value, live.current.minZoom)
    if (!enabled || live.current.locked || !content || next === live.current.zoom) return
    const bounds = viewport.getBoundingClientRect()
    const center = point || { x: bounds.left + viewport.clientWidth / 2, y: bounds.top + viewport.clientHeight / 2 }
    const rect = content.getBoundingClientRect()
    // Retain the original anchor until React commits a batch of gesture updates.
    if (!anchor.current) anchor.current = { point: center, x: (center.x - rect.left) / live.current.zoom, y: (center.y - rect.top) / live.current.zoom }
    live.current.zoom = next
    setCamera({ view, zoom: next })
  }, [viewportRef, view, enabled])

  useLayoutEffect(() => {
    live.current.zoom = zoom
    live.current.locked = locked
  }, [zoom, locked])

  useLayoutEffect(() => {
    live.current.locked = enabled && Boolean(pin)
    anchor.current = null
    const cameraKey = enabled && pin ? `${view}:${pin.zoom}:${pin.scrollLeft}:${pin.scrollTop}` : null
    if (restoredCamera.current === cameraKey) return undefined
    if (!enabled || !pin) { restoredCamera.current = null; return undefined }
    // Restore the saved starting position once. A zoom pin never blocks panning,
    // and expanding another branch must not snap back to this saved position.
    const position = { left: pin.scrollLeft, top: pin.scrollTop }
    // Branch expansion and the restored zoom commit before positioning the camera.
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      if (viewport) {
        viewport.scrollTo({ ...position, behavior: 'instant' })
        restoredCamera.current = cameraKey
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pin, view, viewportRef, enabled])

  useLayoutEffect(() => {
    if (!enabled) return
    const viewport = viewportRef.current
    const content = viewport?.querySelector('.tree-zoom-layer')
    const pending = anchor.current
    if (content && pending && !live.current.locked) {
      const rect = content.getBoundingClientRect()
      viewport.scrollBy({ left: rect.left + pending.x * zoom - pending.point.x, top: rect.top + pending.y * zoom - pending.point.y, behavior: 'instant' })
    }
    if (viewport && zoom <= minZoom && !live.current.locked) {
      const rect = content?.getBoundingClientRect()
      viewport.scrollTo({
        left: rect?.width <= viewport.clientWidth ? 0 : Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2),
        top: rect?.height <= viewport.clientHeight ? 0 : Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2),
        behavior: 'instant',
      })
    }
    anchor.current = null
  }, [zoom, minZoom, viewportRef, enabled])

  useLayoutEffect(() => {
    if (!enabled) return undefined
    const viewport = viewportRef.current
    const content = viewport?.querySelector('.tree-zoom-layer')
    if (!content) return undefined
    function measure() {
      const style = getComputedStyle(viewport)
      const rect = content.getBoundingClientRect()
      const minimum = minimumCanvasZoom({
        width: viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      }, { width: rect.width / live.current.zoom, height: rect.height / live.current.zoom })
      live.current.minZoom = minimum
      setMinZoom(previous => previous === minimum ? previous : minimum)
      if (live.current.zoom < minimum) changeZoom(minimum)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(content)
    measure()
    return () => observer.disconnect()
  }, [viewportRef, view, locked, changeZoom, enabled])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    return bindCanvasGestures(viewport, {
      enabled,
      isLocked: () => live.current.locked,
      getZoom: () => live.current.zoom,
      onZoom: changeZoom,
    })
  }, [viewportRef, view, changeZoom, enabled])

  function toggleLock() {
    const viewport = viewportRef.current
    if (!enabled || !viewport) return
    if (live.current.locked) {
      setCamera({ view, zoom: live.current.zoom })
      live.current.locked = false
      onPinChange(null)
    } else {
      live.current.locked = true
      onPinChange({ zoom: live.current.zoom, scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop })
    }
  }

  return { zoom, minZoom, locked, changeZoom, toggleLock, isLocked }
}
