import { createTreeFromBuckets } from './flowTree.js'

// A disposable teaching example, never a starting balance or a saved user plan.
export function createExamplePlan(today = new Date()) {
  const date = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const startDate = date(today)
  const dueDate = date(new Date(today.getFullYear(), today.getMonth() + 12, 0))
  const tree = createTreeFromBuckets([])
  tree.find(group => group.id === 'needs').children = []
  const add = (groupId, id, name, amount, icon, extra = {}) => {
    const group = tree.find(item => item.id === groupId)
    group.children.push({ id, name, amount, icon, symbol: icon, period: 'month', status: 'active', savedAmount: 0, startDate: '', dueDate: '', tone: group.tone, note: '', children: [], ...extra })
  }
  add('needs', 'example-rent', 'Rent', 12000, 'home')
  add('needs', 'example-groceries', 'Groceries', 6000, 'shopping_cart')
  add('needs', 'example-electricity', 'Electricity bill', 1000, 'bolt')
  add('needs', 'example-phone', 'Phone recharge', 500, 'smartphone')
  add('obligations', 'example-loan', 'Laptop loan', 5000, 'computer', {
    loan: { principal: 60000, remainingPrincipal: 60000, annualRate: 0, tenureMonths: 12, extraPayment: 0, userMonthlyContribution: 5000 },
  })
  add('provisions', 'example-emergency', 'Emergency savings', 3000, 'emergency')
  add('protection', 'example-insurance', 'Health insurance', 12000, 'health_and_safety', { period: 'year', startDate, dueDate })
  add('tax', 'example-tax', 'Yearly tax', 6000, 'receipt_long', { period: 'year', startDate, dueDate })
  add('goals', 'example-holiday', 'Holiday fund', 12000, 'flight', { period: 'year', startDate, dueDate })
  add('growth', 'example-investment', 'Monthly investment', 3000, 'trending_up', { investment: { type: 'Mutual fund', currentValue: 0 } })
  return {
    profile: { name: 'Example plan', visible: true },
    incomeSources: [{ id: 'example-salary', name: 'Salary', amount: 50000, icon: 'payments', startDate, dayOfMonth: 1 }],
    buffer: 2000, tree, generalLedgers: [],
  }
}

export function resolveDriveSetupPlan({ currentPlan, blankPlan, useCurrentPlan, isExample }) {
  const usesCurrentPlan = Boolean(useCurrentPlan && !isExample)
  return { plan: usesCurrentPlan ? currentPlan : blankPlan, usesCurrentPlan }
}
