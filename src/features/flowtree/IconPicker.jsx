import { useId, useState } from 'react'
import { FINANCE_ICON_OPTIONS, findFinanceIcon } from './financeIcons'

export default function IconPicker({ value, onChange }) {
  const listId = useId()
  const currentLabel = FINANCE_ICON_OPTIONS.find(([icon]) => icon === value)?.[1] || 'Current icon'
  const [text, setText] = useState(currentLabel)

  return <span className="icon-select">
    <span aria-hidden="true" className="material-symbols-rounded">{value}</span>
    <input list={listId} value={text} placeholder="Type to find an icon" autoComplete="off" required
      onChange={event => {
        const nextText = event.target.value
        const icon = findFinanceIcon(nextText)
        setText(nextText)
        event.target.setCustomValidity(icon || nextText === currentLabel ? '' : 'Choose an icon from the suggestions.')
        if (icon) onChange(icon)
      }} />
    <datalist id={listId}>
      {!FINANCE_ICON_OPTIONS.some(([icon]) => icon === value) && <option value="Current icon" />}
      {FINANCE_ICON_OPTIONS.map(([icon, label]) => <option key={label} value={label}>{icon.replaceAll('_', ' ')}</option>)}
    </datalist>
  </span>
}
