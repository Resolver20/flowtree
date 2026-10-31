const VIEWS = ['home', 'sinking']
export const MIN_CANVAS_ZOOM = 0.01
export const MAX_CANVAS_ZOOM = 1.6

export function normalizeCanvasPins(value) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('canvasPins must be an object.')
  const pins = {}
  for (const view of VIEWS) {
    const pin = value[view]
    if (pin === undefined) continue
    if (!pin || typeof pin !== 'object' || Array.isArray(pin)) throw new Error(`canvasPins.${view} must be an object.`)
    for (const field of ['zoom', 'scrollLeft', 'scrollTop']) {
      const number = pin[field]
      if (typeof number !== 'number' || !Number.isFinite(number) || (field === 'zoom' ? number < MIN_CANVAS_ZOOM || number > MAX_CANVAS_ZOOM : number < 0 || number > 10000000)) {
        throw new Error(`canvasPins.${view}.${field} is outside its supported range.`)
      }
    }
    const path = pin.path ?? []
    const collapsedPaths = pin.collapsedPaths ?? []
    if (!Array.isArray(path) || path.length > 20 || path.some(id => typeof id !== 'string' || !id || id.length > 100)) throw new Error(`canvasPins.${view}.path is invalid.`)
    if (!Array.isArray(collapsedPaths) || collapsedPaths.length > 2000 || collapsedPaths.some(key => typeof key !== 'string' || !key || key.length > 2020)) throw new Error(`canvasPins.${view}.collapsedPaths is invalid.`)
    pins[view] = { zoom: pin.zoom, scrollLeft: pin.scrollLeft, scrollTop: pin.scrollTop, path: [...path], collapsedPaths: [...new Set(collapsedPaths)] }
  }
  const available = VIEWS.filter(view => pins[view])
  if (!available.length) return undefined
  return { ...pins, lastView: available.includes(value.lastView) ? value.lastView : available[0] }
}

export function updateCanvasPin(current, view, pin) {
  if (!VIEWS.includes(view)) return current
  const next = { ...current }
  if (pin) { next[view] = pin; next.lastView = view }
  else delete next[view]
  return normalizeCanvasPins(next)
}

export function pinnedNavigation(pins) {
  return pins?.[pins.lastView] ? { view: pins.lastView, nodeId: null } : undefined
}
