export default function ExpenseTypeField({ value, onChange }) {
  return <label>Expense type<select name="expenseType" value={value} onChange={event => onChange(event.target.value)}><option value="current">Current expenses</option><option value="upcoming">Planned expenses</option></select><small>Current: spending this month. Planned: money set aside for later. This choice controls the monthly summary.</small></label>
}
