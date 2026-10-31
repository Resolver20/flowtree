import { MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM } from './canvasGestures'

export default function CanvasControls({ zoom, minZoom = MIN_CANVAS_ZOOM, locked, changeZoom, toggleLock, sinking }) {
  return <div className={`canvas-controls${sinking ? ' is-sinking' : ''}`} role="group" aria-label="Canvas controls">
    <button type="button" aria-label="Zoom out" disabled={locked || zoom <= minZoom} onClick={() => changeZoom(zoom - 0.1)}>−</button>
    <button type="button" className="canvas-zoom-reset" aria-label="Reset canvas zoom to 100%" disabled={locked} onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
    <button type="button" aria-label="Zoom in" disabled={locked || zoom >= MAX_CANVAS_ZOOM} onClick={() => changeZoom(zoom + 0.1)}>+</button>
    <button type="button" aria-label={locked ? 'Unpin zoom level' : 'Pin zoom level'} aria-pressed={locked} onClick={toggleLock} title={locked ? 'Unpin zoom level' : 'Pin zoom level — scrolling stays available'}><span className="material-symbols-rounded" aria-hidden="true">{locked ? 'lock' : 'keep'}</span></button>
  </div>
}
