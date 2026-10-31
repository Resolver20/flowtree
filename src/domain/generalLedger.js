export function ledgerTotal(ledger) {
  return (ledger.entries || []).reduce((total, entry) => total + (Number(entry.amount) || 0), 0)
}

export function ledgerBudget(ledger) {
  return Math.max(0, Number(ledger.budget) || 0)
}

export function ledgerRemaining(ledger) {
  return ledgerBudget(ledger) - ledgerTotal(ledger)
}

export function ledgerOverview(ledgers) {
  return ledgers.reduce((totals, ledger) => {
    const budget = ledgerBudget(ledger)
    const expenses = ledgerTotal(ledger)
    return {
      budget: totals.budget + budget,
      expenses: totals.expenses + expenses,
      remaining: totals.remaining + budget - expenses,
      expenseCount: totals.expenseCount + (ledger.entries || []).length,
    }
  }, { budget: 0, expenses: 0, remaining: 0, expenseCount: 0 })
}
