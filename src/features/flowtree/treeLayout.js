import { energyAtPath } from '../../domain/energyFlow.js'
import { findPath } from '../../domain/flowTree.js'

const EMPTY_FUNDING = { allocated: 0, target: 0, ratio: 0 }
const LEAF_GAP = 72
const EDGE_INSET = 40
const PERSON_X = 60
const SOURCE_X = 380
const COLUMN_GAP = 280
const COLUMN_START = 630

const pathKey = path => path.join('/')

export function roundedElbowPath(start, end, elbowRatio = .52) {
  const deltaY = end.y - start.y
  if (Math.abs(deltaY) < 1) return `M ${start.x} ${start.y} H ${end.x}`

  const direction = Math.sign(deltaY)
  const radius = Math.min(18, Math.abs(deltaY) / 2)
  const elbowX = start.x + (end.x - start.x) * elbowRatio
  return `M ${start.x} ${start.y} H ${elbowX - radius} Q ${elbowX} ${start.y} ${elbowX} ${start.y + direction * radius} V ${end.y - direction * radius} Q ${elbowX} ${end.y} ${elbowX + radius} ${end.y} H ${end.x}`
}

function countNodesByDepth(items, depth = 0, counts = []) {
  if (!items.length) return counts
  counts[depth] = (counts[depth] || 0) + items.length
  items.forEach(item => countNodesByDepth(item.children || [], depth + 1, counts))
  return counts
}

function createBranchY(tree) {
  const positions = new Map()
  let cursor = EDGE_INSET

  function place(item, parentPath = []) {
    const itemPath = [...parentPath, item.id]
    const childY = (item.children || []).map(child => place(child, itemPath))
    const y = childY.length ? (childY[0] + childY.at(-1)) / 2 : cursor
    if (!childY.length) cursor += LEAF_GAP
    positions.set(pathKey(itemPath), y)
    return y
  }

  tree.forEach(item => place(item))
  return { positions, leafEnd: cursor }
}

function createColumns(tree, path, allocations, expandAll, collapsedPaths) {
  const rootEntries = tree.map((item, index) => ({
    item,
    path: [item.id],
    parentPath: [],
    funding: allocations[index] || EMPTY_FUNDING,
  }))
  const columns = [rootEntries]

  if (expandAll) {
    let currentLevel = rootEntries
    while (currentLevel.some(entry => entry.item.children?.length)) {
      const nextLevel = currentLevel.flatMap(entry => (collapsedPaths.has(pathKey(entry.path)) ? [] : (entry.item.children || []).map(child => {
        const childPath = [...entry.path, child.id]
        return {
          item: child,
          path: childPath,
          parentPath: entry.path,
          funding: energyAtPath(allocations, childPath) || EMPTY_FUNDING,
        }
      })))
      if (!nextLevel.length) break
      columns.push(nextLevel)
      currentLevel = nextLevel
    }
    return columns
  }

  path.forEach((_, index) => {
    const branchPath = path.slice(0, index + 1)
    const branch = findPath(tree, branchPath)
    const branchFunding = energyAtPath(allocations, branchPath)
    if (!branch?.children?.length) return
    columns.push(branch.children.map((item, childIndex) => ({
      item,
      path: [...branchPath, item.id],
      parentPath: branchPath,
      funding: branchFunding?.children?.[childIndex] || EMPTY_FUNDING,
    })))
  })

  return columns
}

function rowY(count, index, height) {
  if (count === 1) return height / 2
  return EDGE_INSET + (height - EDGE_INSET * 2) * index / (count - 1)
}

export function createTreeLayout({ tree, path, allocations, expandAll, collapsedPaths = new Set(), incomeSourceCount = 1, showPerson = true }) {
  const columns = createColumns(tree, path, allocations, expandAll, collapsedPaths)
  const depthCounts = countNodesByDepth(tree)
  const branchY = createBranchY(tree)
  const incomeStackHeight = incomeSourceCount ? 100 + (incomeSourceCount - 1) * 80 : 0
  const treeHeight = expandAll
    ? Math.max(620, branchY.leafEnd - 32)
    : Math.max(620, ...depthCounts.map(count => count * 68 + 40))
  const height = Math.max(treeHeight, incomeStackHeight + 120)
  const expandedVerticalOffset = expandAll && branchY.positions.size
    ? (height - (Math.min(...branchY.positions.values()) + Math.max(...branchY.positions.values()))) / 2
    : 0
  // Keep text at its authored size. The canvas scrolls when the tree is larger
  // than the available space instead of reducing cards to unreadable thumbnails.
  const scale = 1
  // Home's wider summary must sit clear of the first vertical connector trunk.
  const multipleIncomeSources = incomeSourceCount > 1
  const summaryOffset = multipleIncomeSources ? 40 : 0
  const columnStart = COLUMN_START + (showPerson ? 120 : 0) + summaryOffset
  const leftEdge = showPerson || incomeSourceCount ? PERSON_X - 98 : SOURCE_X - 130
  const rightEdge = columnStart + Math.max(0, columns.length - 1) * COLUMN_GAP + 98
  // Size the world around visible content, not hidden Income space or unopened
  // descendant columns. The viewport centers this compact world when it fits.
  const worldPadding = 32
  const worldWidth = rightEdge - leftEdge + worldPadding * 2
  const horizontalOffset = worldPadding - leftEdge
  const personPoint = { x: PERSON_X + horizontalOffset, y: (height - incomeStackHeight) / 2 }
  const incomeSourcePoints = Array.from({ length: incomeSourceCount }, (_, index) => ({
    x: personPoint.x + (multipleIncomeSources ? 118 : 0),
    y: personPoint.y + 100 + index * 80,
  }))
  const sourcePoint = { x: SOURCE_X + summaryOffset + horizontalOffset, y: showPerson ? personPoint.y : height / 2 }
  const introPaths = showPerson ? [
    roundedElbowPath({ x: personPoint.x + 98, y: personPoint.y }, { x: sourcePoint.x - 38, y: sourcePoint.y }),
    ...(multipleIncomeSources ? [
      `M ${personPoint.x} ${personPoint.y + 28} V ${incomeSourcePoints.at(-1).y}`,
      ...incomeSourcePoints.map(point => `M ${personPoint.x} ${point.y} H ${point.x - 98}`),
    ] : incomeSourcePoints.map(point => `M ${personPoint.x} ${personPoint.y + 28} V ${point.y - 28}`)),
  ] : []

  const positionedColumns = columns.map((entries, columnIndex) => ({
    items: entries.map((entry, index) => ({
      ...entry,
      point: {
        x: columnStart + horizontalOffset + columnIndex * COLUMN_GAP,
        y: expandAll
          ? branchY.positions.get(pathKey(entry.path)) + expandedVerticalOffset
          : rowY(entries.length, index, height),
      },
    })),
  }))

  function parentPointFor(columnIndex, entry) {
    if (columnIndex === 0) return sourcePoint
    const parentKey = pathKey(entry.parentPath)
    return positionedColumns[columnIndex - 1].items.find(candidate => pathKey(candidate.path) === parentKey)?.point || sourcePoint
  }

  const connectorGroups = positionedColumns.flatMap((column, columnIndex) => {
    const entriesByParent = new Map()
    column.items.forEach(entry => {
      const key = pathKey(entry.parentPath)
      entriesByParent.set(key, [...(entriesByParent.get(key) || []), entry])
    })
    return [...entriesByParent.entries()].map(([key, entries]) => {
      const parentPoint = parentPointFor(columnIndex, entries[0])
      const d = entries.map(({ point }) => roundedElbowPath(
        { x: parentPoint.x + (columnIndex === 0 ? 40 : 98), y: parentPoint.y },
        { x: point.x - 98, y: point.y },
      )).join(' ')
      return { key: key || 'income', d, columnIndex, rootId: entries[0].path[0] }
    })
  })

  return { connectorGroups, introPaths, height, incomeSourcePoints, personPoint, positionedColumns, scale, sourcePoint, worldWidth }
}
