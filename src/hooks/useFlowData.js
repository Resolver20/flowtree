import { useEffect, useState } from 'react'
import { addChild, createTreeFromBuckets, organizeSubscriptions, removeNode, updateNode } from '../domain/flowTree'

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

function normalizeData(data) {
  const legacyIncome = Math.max(0, Number(data?.income) || 0)
  return {
    ...data,
    profile: data?.profile || { name: 'You', visible: true },
    incomeSources: Array.isArray(data?.incomeSources)
      ? data.incomeSources.map(normalizeIncomeSource)
      : [normalizeIncomeSource({ id: 'salary', name: 'Salary', amount: legacyIncome, icon: 'payments' })],
    generalLedgers: Array.isArray(data?.generalLedgers) ? data.generalLedgers : [],
    tree: organizeSubscriptions(Array.isArray(data?.tree) ? data.tree : createTreeFromBuckets([])),
  }
}

export function createBlankFlowData() {
  return normalizeData({
    profile: { name: 'You', visible: true },
    incomeSources: [],
    generalLedgers: [],
    buffer: 0,
    tree: createTreeFromBuckets([]),
  })
}

export function useFlowData() {
  const [data, setData] = useState(createBlankFlowData)

  // Plans are intentionally kept only in React memory until a Google Drive
  // connection is established. Remove old browser-persistent copies as soon
  // as the app starts so closing the tab leaves no local financial data.
  useEffect(() => {
    localStorage.removeItem('flowtree-v2')
    localStorage.removeItem('flowtree-data')
  }, [])

  function changeProfile(changes) {
    setData(previous => ({ ...previous, profile: { ...previous.profile, ...changes } }))
  }

  function changeIncomeSource(id, changes) {
    setData(previous => ({ ...previous, incomeSources: previous.incomeSources.map(source => source.id === id ? normalizeIncomeSource({ ...source, ...changes }) : source) }))
  }

  function createIncomeSource(source) {
    setData(previous => ({ ...previous, incomeSources: [...previous.incomeSources, normalizeIncomeSource(source)] }))
  }

  function deleteIncomeSource(id) {
    setData(previous => ({ ...previous, incomeSources: previous.incomeSources.filter(source => source.id !== id) }))
  }

  function restoreIncomeSources(incomeSources) {
    setData(previous => ({ ...previous, incomeSources: incomeSources.map(normalizeIncomeSource) }))
  }

  function setBuffer(buffer) {
    setData(previous => ({ ...previous, buffer }))
  }

  function createGeneralLedger(ledger) {
    setData(previous => ({ ...previous, generalLedgers: [...previous.generalLedgers, ledger] }))
  }

  function updateGeneralLedger(id, changes) {
    setData(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === id ? { ...ledger, ...changes } : ledger) }))
  }

  function deleteGeneralLedger(id) {
    setData(previous => ({ ...previous, generalLedgers: previous.generalLedgers.filter(ledger => ledger.id !== id) }))
  }

  function createLedgerEntry(ledgerId, entry) {
    setData(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === ledgerId ? { ...ledger, entries: [...ledger.entries, entry] } : ledger) }))
  }

  function deleteLedgerEntry(ledgerId, entryId) {
    setData(previous => ({ ...previous, generalLedgers: previous.generalLedgers.map(ledger => ledger.id === ledgerId ? { ...ledger, entries: ledger.entries.filter(entry => entry.id !== entryId) } : ledger) }))
  }

  function changeNode(id, changes) {
    setData(previous => ({ ...previous, tree: updateNode(previous.tree, id, changes) }))
  }

  function changeNodes(updates) {
    setData(previous => ({
      ...previous,
      tree: updates.reduce((nextTree, update) => updateNode(nextTree, update.id, update.changes), previous.tree),
    }))
  }

  function createChild(parentId, child) {
    setData(previous => ({ ...previous, tree: addChild(previous.tree, parentId, child) }))
  }

  function deleteNode(id) {
    setData(previous => ({ ...previous, tree: removeNode(previous.tree, id) }))
  }

  function restoreTree(tree) {
    setData(previous => ({ ...previous, tree }))
  }

  function replaceData(nextData) {
    setData(normalizeData(nextData))
  }

  return { ...data, setBuffer, changeProfile, changeIncomeSource, createIncomeSource, deleteIncomeSource, restoreIncomeSources, createGeneralLedger, updateGeneralLedger, deleteGeneralLedger, createLedgerEntry, deleteLedgerEntry, changeNode, changeNodes, createChild, deleteNode, restoreTree, replaceData }
}
