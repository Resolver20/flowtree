import { useEffect, useId, useRef, useState } from 'react'
import { dateEntryError, displayDateInput, formatDateTyping, parseDateInput } from '../../domain/dateEntry'

export default function DateField({ label, value = '', onChange, name, min, max, required = true, children }) {
  const id = useId()
  const textRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const text = draft?.value === value ? draft.text : displayDateInput(value)
  const error = dateEntryError(text, { min, max })

  useEffect(() => {
    textRef.current?.setCustomValidity(error)
  }, [error])

  function typeDate(event) {
    const nextText = formatDateTyping(event.target.value)
    const nextValue = parseDateInput(nextText)
    setDraft({ value: nextValue, text: nextText })
    onChange(nextValue)
  }

  function chooseDate(event) {
    const nextValue = event.target.value
    setDraft({ value: nextValue, text: displayDateInput(nextValue) })
    onChange(nextValue)
  }

  function openCalendar(event) {
    if (!event.currentTarget.showPicker) return
    event.preventDefault()
    event.currentTarget.showPicker()
  }

  return <div className="date-field">
    <label htmlFor={id}>{label}</label>
    <div className={`date-field-entry${children ? ' has-action' : ''}`}>
      <input ref={textRef} id={id} className="date-text-input" type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/YYYY" maxLength={10} value={text} onChange={typeDate} required={required} aria-invalid={Boolean(error)} />
      <span className="date-calendar-trigger">
        <span className="material-symbols-rounded" aria-hidden="true">calendar_month</span>
        <input className="date-calendar-input" type="date" value={value} min={min} max={max} onClick={openCalendar} onChange={chooseDate} aria-label={`Choose ${label.toLowerCase()} from calendar`} />
      </span>
      {children && <span className="date-field-action">{children}</span>}
    </div>
    {name && <input type="hidden" name={name} value={value} />}
  </div>
}
