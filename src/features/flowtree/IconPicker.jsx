import { useId, useState } from 'react'
import { FINANCE_ICON_OPTIONS, matchingFinanceIcons } from './financeIcons'

export default function IconPicker({ value, onChange }) {
  const listId = useId()
  const currentIcon = value?.trim() || 'savings'
  const [selection, setSelection] = useState(null)
  const currentLabel = selection?.icon === currentIcon ? selection.label : value?.trim() ? FINANCE_ICON_OPTIONS.find(([icon]) => icon === currentIcon)?.[1] || 'Current icon' : ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(null)
  const [active, setActive] = useState(-1)
  const options = matchingFinanceIcons(query || '')
  const previewIcon = query && options.length === 1 && options[0][1] === query ? options[0][0] : currentIcon

  function closePicker(resetQuery = true) {
    setOpen(false)
    if (resetQuery) setQuery(null)
    setActive(-1)
  }
  function choose([icon, label]) {
    setSelection({ icon, label })
    onChange(icon)
    closePicker()
  }

  return <span className="icon-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closePicker(false) }}>
    <span className="icon-select">
      <span className="material-symbols-rounded" aria-hidden="true">{previewIcon}</span>
      <input type="text" role="combobox" aria-label="Search icons" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined} placeholder="Type to find an icon" autoComplete="off" value={query ?? currentLabel}
        onFocus={event => { setOpen(true); event.target.select() }}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); closePicker() }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true)
            const next = !options.length ? -1 : active < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
            setActive(next)
            requestAnimationFrame(() => document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' }))
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (options[active]) choose(options[active]); else if (options.length === 1) choose(options[0]) }
        }} />
    </span>
    {open && <span className="icon-picker-panel">
      <span className="icon-picker-list" id={listId} role="listbox" aria-label="Matching icons">
        {options.map(([icon, label], index) => <button type="button" role="option" tabIndex={-1} id={`${listId}-${index}`} key={label} aria-label={label} aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose([icon, label])}>
          <span className="material-symbols-rounded" aria-hidden="true">{icon}</span>
          <span className="icon-picker-label">{label}</span>
        </button>)}
      </span>
    </span>}
  </span>
}
