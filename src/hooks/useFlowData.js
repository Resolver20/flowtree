import { useState } from 'react'
import { normalizeCanvasPins, updateCanvasPin } from '../domain/canvasPins'
import { preserveCurrentMonth, recordPayment } from '../domain/monthlyHistory'
import { addChild, createTreeFromBuckets, normalizeTreeStatuses, organizeSubscriptions, removeNode, updateNode } from '../domain/flowTree'

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeIncomeSource(source) {
  const dayOfMonth = Number(source?.dayOfMonth)
  return {
    ...source,
    startDate: source?.startDate || localDateValue(),
    dayOfMonth: Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : 1,
  }
}

function normalizeGeneralLedger(ledger) {
  return {
    ...ledger,
    // Older Drive plans did not have a ledger budget. Keep them usable while
    // making the new remaining calculation predictable.
    budget: Math.max(0, Number(ledger?.budget) || 0),
    entries: Array.isArray(ledger?.entries) ? ledger.entries : [],
  }
}

export function normalizeFlowData(data) {
  const legacyIncome = Math.max(0, Number(data?.income) || 0)
  return {
    ...data,
    canvasPins: normalizeCanvasPins(data?.canvasPins),
    profile: data?.profile || { name: 'You', visible: true },
    incomeSources: Array.isArray(data?.incomeSources)
      ? data.incomeSources.map(normalizeIncomeSource)
      : [normalizeIncomeSource({ id: 'salary', name: 'Salary', amount: legacyIncome, icon: 'payments' })],
    generalLedgers: Array.isArray(data?.generalLedgers) ? data.generalLedgers.map(normalizeGeneralLedger) : [],
    tree: normalizeTreeStatuses(organizeSubscriptions(Array.isArray(data?.tree) ? data.tree : createTreeFromBuckets([]))),
  }
}

export function createBlankFlowData() {
  return normalizeFlowData({
    profile: { name: 'You', visible: true },
    incomeSources: [],
    generalLedgers: [],
    buffer: 0,
    tree: createTreeFromBuckets([]),
  })
}

export function useFlowData(initialData) {
  const [history, setHistory] = useState(() => ({ data: initialData ? normalizeFlowData(initialData) : createBlankFlowData(), past: [], future: [] }))
  const data = history.data

  function record(change) {
    setHistory(previous => {
      const baseline = preserveCurrentMonth(previous.data)
      const nextData = change(baseline)
      if (nextData === baseline) return previous
      return { data: nextData, past: [...previous.past, previous.data].slice(-50), future: [] }
    })
  }

  function changeProfile(changes) {
    record(previous => ({ ...previous, profile: { ...previous.profile, ...changes } }))
  }

  function changeCanvasPin(view, pin) {
    record(previous => ({ ...previous, canvasPins: updateCanvasPin(previous.canvasPins, view, pin) }))
  }

  function changeIncomeSource(id, changes) {
    record(previous => ({ ...previous, incomeSources: previous.incomeSources.map(source => source.id === id ? normalizeIncomeSource({ ...source, ...changes }) : source) }))
  }

  function createIncomeSource(source) {
    record(previous => ({ ...previous, incomeSources: [...previous.incomeSources, normalizeIncomeSource(source)] }))
  }

  function deleteIncomeSource(id) {
    record(previous => ({ ...previous, incomeSources: previous.incomeSources.filter(source => source.id !== id) }))
  }

  function restoreIncomeSources(incomeSources) {
    record(previous => ({ ...previous, incomeSources: incomeSources.map(normalizeIncomeSource) }))
  }

  function setBuffer(buffer) {
    record(previous => ({ ...previous, buffer }))
  }

  function createGeneralLedger(ledger) {
    record(previous => ({ ...previous, generalLedgers: [...previous.generalLedgers, ledger] }))
  }

  function updateGeneralLedger(id, changes) {
    record(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === id ? { ...ledger, ...changes } : ledger) }))
  }

  function deleteGeneralLedger(id) {
    record(previous => ({ ...previous, generalLedgers: previous.generalLedgers.filter(ledger => ledger.id !== id) }))
  }

  function createLedgerEntry(ledgerId, entry) {
    record(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === ledgerId ? { ...ledger, entries: [...ledger.entries, entry] } : ledger) }))
  }

  function deleteLedgerEntry(ledgerId, entryId) {
    record(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === ledgerId ? { ...ledger, entries: ledger.entries.filter(entry => entry.id !== entryId) } : ledger) }))
  }

  function changeNode(id, changes) {
    record(previous => ({ ...previous, tree: updateNode(previous.tree, id, changes) }))
  }

  function changeNodes(updates) {
    record(previous => ({
      ...previous,
      tree: updates.reduce((nextTree, update) => updateNode(nextTree, update.id, update.changes), previous.tree),
    }))
  }

  function createChild(parentId, child) {
    record(previous => ({ ...previous, tree: addChild(previous.tree, parentId, child) }))
  }

  function deleteNode(id) {
    record(previous => ({ ...previous, tree: removeNode(previous.tree, id) }))
  }

  function restoreTree(tree) {
    record(previous => ({ ...previous, tree }))
  }

  function replaceData(nextData, { resetHistory = false } = {}) {
    const normalized = normalizeFlowData(nextData)
    if (resetHistory) setHistory({ data: normalized, past: [], future: [] })
    else record(() => normalized)
  }

  function captureCurrentMonth() {
    setHistory(previous => ({ ...previous, data: preserveCurrentMonth(previous.data) }))
  }

  function markPaymentPaid(month, paymentId, paidDate) {
    record(previous => recordPayment(previous, month, paymentId, paidDate))
  }

  function undo() {
    setHistory(previous => {
      const previousData = previous.past.at(-1)
      if (!previousData) return previous
      return { data: previousData, past: previous.past.slice(0, -1), future: [previous.data, ...previous.future].slice(0, 50) }
    })
  }

  function redo() {
    setHistory(previous => {
      const nextData = previous.future[0]
      if (!nextData) return previous
      return { data: nextData, past: [...previous.past, previous.data].slice(-50), future: previous.future.slice(1) }
    })
  }

  return { ...data, captureCurrentMonth, markPaymentPaid, setBuffer, changeProfile, changeCanvasPin, changeIncomeSource, createIncomeSource, deleteIncomeSource, restoreIncomeSources, createGeneralLedger, updateGeneralLedger, deleteGeneralLedger, createLedgerEntry, deleteLedgerEntry, changeNode, changeNodes, createChild, deleteNode, restoreTree, replaceData, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 }
}
