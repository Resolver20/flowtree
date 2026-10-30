import { NODE_STATUSES } from './flowTree.js'

export const FLOWTREE_EXPORT_FORMAT = 'flowtree-plan'
export const FLOWTREE_EXPORT_VERSION = 1
export const MAX_IMPORT_BYTES = 2_000_000

const MAX_NODES = 2_000
const MAX_DEPTH = 20
const MAX_GENERAL_LEDGERS = 100
const MAX_LEDGER_ENTRIES = 2_000

function fail(message) {
  throw new Error(message)
}

function objectAt(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object.`)
  return value
}

function arrayAt(value, path) {
  if (!Array.isArray(value)) fail(`${path} must be an array.`)
  return value
}

function textAt(value, path, { fallback, maxLength = 100 } = {}) {
  if ((value === undefined || value === null) && fallback !== undefined) return fallback
  if (typeof value !== 'string' || !value.trim()) fail(`${path} must be a non-empty string.`)
  const valueText = value.trim()
  if (valueText.length > maxLength) fail(`${path} must be ${maxLength} characters or fewer.`)
  return valueText
}

function optionalText(value, path, fallback = '', maxLength = 100) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') fail(`${path} must be a string.`)
  if (value.length > maxLength) fail(`${path} must be ${maxLength} characters or fewer.`)
  return value
}

function amountAt(value, path, fallback) {
  if ((value === undefined || value === null) && fallback !== undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${path} must be a non-negative number.`)
  return value
}

function signedAmountAt(value, path, fallback) {
  if ((value === undefined || value === null) && fallback !== undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be a number.`)
  return value
}

function dateAt(value, path) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${path} must use YYYY-MM-DD.`)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) fail(`${path} is not a valid date.`)
  return value
}

function loanAt(value, path) {
  if (value === undefined || value === null) return null
  const loan = objectAt(value, path)
  const principal = amountAt(loan.principal, `${path}.principal`)
  const remainingPrincipal = signedAmountAt(loan.remainingPrincipal, `${path}.remainingPrincipal`, principal)
  if (remainingPrincipal > principal) fail(`${path}.remainingPrincipal cannot exceed ${path}.principal.`)
  const annualRate = amountAt(loan.annualRate, `${path}.annualRate`)
  const tenureMonths = loan.tenureMonths
  if (!Number.isInteger(tenureMonths) || tenureMonths < 1 || tenureMonths > 600) fail(`${path}.tenureMonths must be an integer from 1 to 600.`)
  const extraPayment = amountAt(loan.extraPayment, `${path}.extraPayment`, 0)
  const userMonthlyContribution = loan.userMonthlyContribution === undefined
    ? undefined
    : amountAt(loan.userMonthlyContribution, `${path}.userMonthlyContribution`)
  return { principal, remainingPrincipal, annualRate, tenureMonths, extraPayment, ...(userMonthlyContribution === undefined ? {} : { userMonthlyContribution }) }
}

function investmentAt(value, path) {
  // Investment values are user-entered records, separate from the monthly
  // contribution that participates in the plan allocation.
  if (value === undefined || value === null) return null
  const investment = objectAt(value, path)
  return {
    type: optionalText(investment.type, `${path}.type`, 'Investment', 64),
    currentValue: amountAt(investment.currentValue, `${path}.currentValue`, 0),
  }
}

function generalLedgersAt(value) {
  if (value === undefined || value === null) return []
  const ids = new Set()
  return arrayAt(value, 'data.generalLedgers').map((ledger, ledgerIndex) => {
    if (ledgerIndex >= MAX_GENERAL_LEDGERS) fail(`data.generalLedgers cannot contain more than ${MAX_GENERAL_LEDGERS} ledgers.`)
    const source = objectAt(ledger, `data.generalLedgers[${ledgerIndex}]`)
    const id = textAt(source.id, `data.generalLedgers[${ledgerIndex}].id`)
    if (ids.has(id)) fail(`Duplicate general ledger id: ${id}.`)
    ids.add(id)
    const entries = arrayAt(source.entries ?? [], `data.generalLedgers[${ledgerIndex}].entries`)
    if (entries.length > MAX_LEDGER_ENTRIES) fail(`data.generalLedgers[${ledgerIndex}].entries cannot contain more than ${MAX_LEDGER_ENTRIES} entries.`)
    const entryIds = new Set()
    return {
      id,
      name: textAt(source.name, `data.generalLedgers[${ledgerIndex}].name`),
      note: optionalText(source.note, `data.generalLedgers[${ledgerIndex}].note`, '', 300),
      symbol: optionalText(source.symbol, `data.generalLedgers[${ledgerIndex}].symbol`, 'receipt_long', 64),
      budget: amountAt(source.budget, `data.generalLedgers[${ledgerIndex}].budget`, 0),
      entries: entries.map((entry, entryIndex) => {
        const item = objectAt(entry, `data.generalLedgers[${ledgerIndex}].entries[${entryIndex}]`)
        const entryId = textAt(item.id, `data.generalLedgers[${ledgerIndex}].entries[${entryIndex}].id`)
        if (entryIds.has(entryId)) fail(`Duplicate ledger entry id: ${entryId}.`)
        entryIds.add(entryId)
        return { id: entryId, date: dateAt(item.date, `data.generalLedgers[${ledgerIndex}].entries[${entryIndex}].date`), description: textAt(item.description, `data.generalLedgers[${ledgerIndex}].entries[${entryIndex}].description`), amount: amountAt(item.amount, `data.generalLedgers[${ledgerIndex}].entries[${entryIndex}].amount`) }
      }),
    }
  })
}

function normalizeNode(node, path, ids, counters, depth) {
  if (depth > MAX_DEPTH) fail(`The tree cannot be deeper than ${MAX_DEPTH} levels.`)
  if (++counters.nodes > MAX_NODES) fail(`The tree cannot contain more than ${MAX_NODES} items.`)
  const source = objectAt(node, path)
  const id = textAt(source.id, `${path}.id`)
  if (ids.has(id)) fail(`Duplicate destination id: ${id}.`)
  ids.add(id)

  const period = source.period ?? 'month'
  if (!['month', 'year'].includes(period)) fail(`${path}.period must be "month" or "year".`)
  const status = source.status ?? 'active'
  if (!NODE_STATUSES.includes(status)) fail(`${path}.status must be one of: ${NODE_STATUSES.join(', ')}.`)

  const normalizedLoan = loanAt(source.loan, `${path}.loan`)
  const normalizedInvestment = investmentAt(source.investment, `${path}.investment`)
  return {
    id,
    name: textAt(source.name, `${path}.name`),
    amount: amountAt(source.amount, `${path}.amount`, 0),
    savedAmount: amountAt(source.savedAmount, `${path}.savedAmount`, 0),
    startDate: dateAt(source.startDate, `${path}.startDate`),
    dueDate: dateAt(source.dueDate, `${path}.dueDate`),
    dayOfMonth: (() => {
      const value = source.dayOfMonth ?? 1
      if (!Number.isInteger(value) || value < 1 || value > 31) fail(`${path}.dayOfMonth must be an integer from 1 to 31.`)
      return value
    })(),
    period,
    status,
    icon: optionalText(source.icon, `${path}.icon`, '', 64),
    symbol: optionalText(source.symbol, `${path}.symbol`, '', 64),
    tone: optionalText(source.tone, `${path}.tone`, 'blue', 32),
    note: optionalText(source.note, `${path}.note`, '', 500),
    ...(normalizedLoan ? { loan: normalizedLoan } : {}),
    ...(normalizedInvestment ? { investment: normalizedInvestment } : {}),
    children: arrayAt(source.children ?? [], `${path}.children`).map((child, index) => normalizeNode(child, `${path}.children[${index}]`, ids, counters, depth + 1)),
  }
}

function monthlyHistoryAt(value) {
  const source = objectAt(value, 'data.monthlyHistory')
  const result = {}
  const months = Object.entries(source)
  if (months.length > 1200) fail('Monthly history cannot exceed 1200 months.')
  for (const [month, raw] of months) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('Invalid month in monthly history.')
    const snapshot = objectAt(raw, `monthlyHistory.${month}`)
    const ids = new Set()
    const payments = arrayAt(snapshot.payments, 'monthly payments')
    if (payments.length > MAX_NODES) fail('Too many monthly payments.')
    result[month] = {
      month,
      income: amountAt(snapshot.income, 'monthly income'),
      buffer: amountAt(snapshot.buffer, 'monthly buffer'),
      planned: amountAt(snapshot.planned, 'monthly planned'),
      payments: payments.map(rawPayment => {
        const payment = objectAt(rawPayment, 'monthly payment')
        const id = textAt(payment.id, 'payment id')
        if (ids.has(id)) fail('Duplicate monthly payment id.')
        ids.add(id)
        const scheduledDate = dateAt(payment.scheduledDate, 'scheduled date')
        const paidDate = dateAt(payment.paidDate, 'paid date')
        if (scheduledDate.slice(0, 7) !== month || (paidDate && paidDate.slice(0, 7) !== month)) fail('Payment dates must belong to their snapshot month.')
        if (!Number.isInteger(payment.dayOfMonth) || payment.dayOfMonth < 1 || payment.dayOfMonth > 31) fail('Invalid payment day.')
        return { id, name: textAt(payment.name, 'payment name'), symbol: optionalText(payment.symbol, 'payment symbol', 'event_repeat', 64),
          category: textAt(payment.category, 'payment category'), monthlyAmount: amountAt(payment.monthlyAmount, 'payment amount'),
          dayOfMonth: payment.dayOfMonth, scheduledDate, paidDate }
      }),
    }
  }
  return result
}

function normalizePlan(value) {
  const source = objectAt(value, 'data')
  const profileSource = objectAt(source.profile, 'data.profile')
  const profile = {
    name: textAt(profileSource.name, 'data.profile.name'),
    visible: profileSource.visible === undefined ? true : profileSource.visible,
  }
  if (typeof profile.visible !== 'boolean') fail('data.profile.visible must be true or false.')

  const incomeIds = new Set()
  const incomeSources = arrayAt(source.incomeSources, 'data.incomeSources').map((income, index) => {
    const entry = objectAt(income, `data.incomeSources[${index}]`)
    const id = textAt(entry.id, `data.incomeSources[${index}].id`)
    if (incomeIds.has(id)) fail(`Duplicate income source id: ${id}.`)
    incomeIds.add(id)
    return {
      id,
      name: textAt(entry.name, `data.incomeSources[${index}].name`),
      amount: amountAt(entry.amount, `data.incomeSources[${index}].amount`),
      icon: optionalText(entry.icon, `data.incomeSources[${index}].icon`, 'payments', 64),
      startDate: dateAt(entry.startDate, `data.incomeSources[${index}].startDate`),
      dayOfMonth: (() => {
        const value = entry.dayOfMonth ?? 1
        if (!Number.isInteger(value) || value < 1 || value > 31) fail(`data.incomeSources[${index}].dayOfMonth must be an integer from 1 to 31.`)
        return value
      })(),
    }
  })

  const nodeIds = new Set()
  const counters = { nodes: 0 }
  const tree = arrayAt(source.tree, 'data.tree').map((node, index) => normalizeNode(node, `data.tree[${index}]`, nodeIds, counters, 1))

  return {
    profile,
    incomeSources,
    generalLedgers: generalLedgersAt(source.generalLedgers),
    ...(source.monthlyHistory === undefined ? {} : { monthlyHistory: monthlyHistoryAt(source.monthlyHistory) }),
    buffer: amountAt(source.buffer, 'data.buffer'),
    tree,
  }
}

export function createFlowExport(data, exportedAt = new Date()) {
  return {
    format: FLOWTREE_EXPORT_FORMAT,
    version: FLOWTREE_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    data: normalizePlan(data),
  }
}

export function serializeFlowData(data) {
  return `${JSON.stringify(normalizePlan(data), null, 2)}\n`
}

export function parseFlowImport(text) {
  if (typeof text !== 'string' || !text.trim()) fail('Choose a non-empty JSON file.')
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) fail('The JSON file is larger than 2 MB.')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    fail('The selected file is not valid JSON.')
  }

  const source = objectAt(parsed, 'file')
  if (source.format !== undefined) {
    if (source.format !== FLOWTREE_EXPORT_FORMAT) fail('This is not a Flowtree plan file.')
    if (source.version !== FLOWTREE_EXPORT_VERSION) fail(`Flowtree export version ${source.version} is not supported.`)
    return normalizePlan(source.data)
  }
  return normalizePlan(source)
}

export function summarizeFlowData(data) {
  let destinations = 0
  let yearlyTargets = 0
  function visit(nodes) {
    nodes.forEach(node => {
      destinations += 1
      if (node.period === 'year') yearlyTargets += 1
      visit(node.children || [])
    })
  }
  visit(data.tree)
  return { destinations, yearlyTargets, incomeSources: data.incomeSources.length }
}
