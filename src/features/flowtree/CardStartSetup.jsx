import { useState } from 'react'
import { cardStartDate, cardStartMode } from '../../domain/cardStart'

export default function CardStartSetup({ mode, onModeChange, startDate, onStartDateChange }) {
  const [localMode, setLocalMode] = useState(() => cardStartMode(startDate))
  const selectedMode = mode ?? localMode
  function changeMode(nextMode) {
    setLocalMode(nextMode)
    if (onModeChange) onModeChange(nextMode)
    else if (nextMode === 'fresh') onStartDateChange(cardStartDate())
  }
  return <>
    <label>Card setup<select value={selectedMode} onChange={event => changeMode(event.target.value)}><option value="fresh">Fresh</option><option value="existing">Already started</option></select></label>
    {selectedMode === 'existing' && <label>Start date<input name="startDate" type="date" value={startDate} onChange={event => onStartDateChange(event.target.value)} required /></label>}
    {selectedMode === 'fresh' && <input name="startDate" type="hidden" value={startDate} />}
  </>
}
