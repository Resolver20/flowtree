import { useId, useRef, useState } from 'react'
import { FINANCE_ICON_OPTIONS } from './financeIcons'

export default function IconPicker({ value, onChange }) {
  const listId = useId()
  const input = useRef(null)
  const currentLabel = FINANCE_ICON_OPTIONS.find(([icon]) => icon === value)?.[1] || 'Current icon'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(null)
  const [active, setActive] = useState(-1)
  const words = (query || '').toLowerCase().trim().split(/\s+/).filter(Boolean)
  const options = FINANCE_ICON_OPTIONS.filter(([icon, label]) => words.every(word => `${label} ${icon.replaceAll('_', ' ')}`.toLowerCase().includes(word)))

  function closePicker() {
    setOpen(false)
    setQuery(null)
    setActive(-1)
  }
  function choose(icon) {
    onChange(icon)
    closePicker()
  }

  return <span className="mobile-icon-picker">
    <span className="icon-search-field">
      <span className="material-symbols-rounded" aria-hidden="true">{value}</span>
      <input ref={input} type="text" role="combobox" aria-label="Search icons" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} placeholder="Type to find an icon" autoComplete="off" value={query ?? currentLabel}
        onFocus={event => { setOpen(true); event.target.select() }}
        onBlur={closePicker}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); closePicker() }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true)
            const next = !options.length ? -1 : active < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
            setActive(next)
            requestAnimationFrame(() => document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' }))
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (options[active]) choose(options[active][0]); else if (options.length === 1) choose(options[0][0]) }
        }} />
      <span className="material-symbols-rounded" aria-hidden="true">search</span>
    </span>
    {open && <span className="icon-picker-panel">
      <span className="icon-picker-options" id={listId} role="listbox" aria-label="Matching icons">
        {options.map(([icon, label], index) => <button type="button" role="option" tabIndex={-1} id={`${listId}-${index}`} key={label} aria-label={label} aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(icon)}>
          <span className="material-symbols-rounded" aria-hidden="true">{icon}</span>
          <span>{label}</span>
          {value === icon && <span className="material-symbols-rounded icon-picker-check" aria-hidden="true">check</span>}
        </button>)}
      </span>
      {!options.length && <span className="icon-picker-empty" role="status">No icons found. Try another name.</span>}
    </span>}
  </span>
}
