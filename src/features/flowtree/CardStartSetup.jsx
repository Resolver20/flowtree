import { useState } from 'react'
import DateField from './DateField'
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
    {selectedMode === 'existing' && <DateField label="Start date" name="startDate" value={startDate} onChange={onStartDateChange} />}
    {selectedMode === 'fresh' && <input name="startDate" type="hidden" value={startDate} />}
  </>
}
