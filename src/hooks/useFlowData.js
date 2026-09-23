import { useEffect, useState } from 'react'
import { addChild, createTreeFromBuckets, removeNode, updateNode } from '../domain/flowTree'

const CURRENT_KEY = 'flowtree-v2'
const LEGACY_KEY = 'flowtree-data'

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

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
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
  }
}

function readInitialData() {
  const current = readJson(CURRENT_KEY)
  if (current && Array.isArray(current.tree)) {
    return normalizeData(current)
  }

  // Preserve legacy browser data while migrating the plan into the tree shape.
  const legacy = readJson(LEGACY_KEY)
  return normalizeData({
    income: legacy?.income ?? '',
    buffer: legacy?.buffer ?? 0,
    tree: createTreeFromBuckets(legacy?.buckets),
    transactions: legacy?.transactions ?? [],
  })
}

export function useFlowData() {
  const [data, setData] = useState(readInitialData)
  const [storageError, setStorageError] = useState('')

  // Storage is an external system; reflect write failures in the UI without
  // discarding the user's in-memory edits.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(data))
      setStorageError('')
    } catch {
      setStorageError('Changes are only in this tab. Browser storage is unavailable; keep this tab open.')
    }
  }, [data])
  /* oxlint-enable react/set-state-in-effect */

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
    setData(nextData)
  }

  return { ...data, storageError, setBuffer, changeProfile, changeIncomeSource, createIncomeSource, deleteIncomeSource, restoreIncomeSources, changeNode, changeNodes, createChild, deleteNode, restoreTree, replaceData }
}
