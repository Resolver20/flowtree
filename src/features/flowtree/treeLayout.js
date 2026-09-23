import { energyAtPath } from '../../domain/energyFlow'
import { findPath } from '../../domain/flowTree'

const EMPTY_FUNDING = { allocated: 0, target: 0, ratio: 0 }
const LEAF_GAP = 72
const EDGE_INSET = 40
const PERSON_X = 60
const INCOME_SOURCE_X = 230
const SOURCE_X = 450
const COLUMN_GAP = 235
const COLUMN_START = 700

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

function createColumns(tree, path, allocations, expandAll, planOpen) {
  if (!planOpen) return []
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
      const nextLevel = currentLevel.flatMap(entry => (entry.item.children || []).map(child => {
        const childPath = [...entry.path, child.id]
        return {
          item: child,
          path: childPath,
          parentPath: entry.path,
          funding: energyAtPath(allocations, childPath) || EMPTY_FUNDING,
        }
      }))
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

export function createTreeLayout({ tree, path, allocations, expandAll, planOpen = true, viewport, incomeSourceCount = 1, showPerson = true }) {
  const columns = createColumns(tree, path, allocations, expandAll, planOpen)
  const depthCounts = countNodesByDepth(tree)
  const branchY = createBranchY(tree)
  const height = expandAll
    ? Math.max(620, branchY.leafEnd - 32)
    : Math.max(620, ...depthCounts.map(count => count * 68 + 40))
  const expandedVerticalOffset = expandAll && branchY.positions.size
    ? (height - (Math.min(...branchY.positions.values()) + Math.max(...branchY.positions.values()))) / 2
    : 0
  const worldWidth = Math.max(1180, COLUMN_START + Math.max(0, depthCounts.length - 1) * COLUMN_GAP + 120)
  const isNarrowViewport = viewport.width < 900
  const isShortViewport = !isNarrowViewport && viewport.height < 680
  // Preserve card readability on narrow or short-aspect viewports. A plan
  // squeezed into the available height becomes illegible, so the canvas gets
  // a contained scroll surface at those sizes instead of shrinking forever.
  const scale = isNarrowViewport
    ? Math.min(.82, Math.max(.72, viewport.width / worldWidth))
    : isShortViewport
      ? .72
    : Math.min(1, viewport.width / worldWidth, viewport.height / height)
  const leftEdge = showPerson ? PERSON_X - 36 : incomeSourceCount ? INCOME_SOURCE_X - 98 : SOURCE_X - 36
  const rightEdge = planOpen
    ? COLUMN_START + Math.max(0, columns.length - 1) * COLUMN_GAP + 98
    : SOURCE_X + 40
  const centeredOffset = (worldWidth - leftEdge - rightEdge) / 2
  const narrowOffset = isNarrowViewport
    ? planOpen
      ? -140
      : viewport.width / (2 * scale) - (leftEdge + rightEdge) / 2 - centeredOffset
    : 0
  const horizontalOffset = centeredOffset + narrowOffset
  const personPoint = { x: PERSON_X + horizontalOffset, y: height / 2 }
  const incomeSourcePoints = Array.from({ length: incomeSourceCount }, (_, index) => ({
    x: INCOME_SOURCE_X + horizontalOffset,
    y: height / 2 + (index - (incomeSourceCount - 1) / 2) * LEAF_GAP,
  }))
  const sourcePoint = { x: SOURCE_X + horizontalOffset, y: height / 2 }

  const positionedColumns = columns.map((entries, columnIndex) => ({
    items: entries.map((entry, index) => ({
      ...entry,
      point: {
        x: COLUMN_START + horizontalOffset + columnIndex * COLUMN_GAP,
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

  return { connectorGroups, height, incomeSourcePoints, personPoint, positionedColumns, scale, sourcePoint, worldWidth }
}
