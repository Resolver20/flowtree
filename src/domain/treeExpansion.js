import { findPath } from './flowTree.js'

// Reopening a branch reveals one level. Other branches keep their current state.
export function toggleBranch(tree, collapsedPaths, path) {
  const next = new Set(collapsedPaths)
  const key = path.join('/')
  if (!next.has(key)) {
    next.add(key)
    return next
  }

  next.delete(key)
  function closeDescendants(nodes, parentPath) {
    for (const node of nodes) {
      const childPath = [...parentPath, node.id]
      if (node.children?.length) {
        next.add(childPath.join('/'))
        closeDescendants(node.children, childPath)
      }
    }
  }
  closeDescendants(findPath(tree, path)?.children || [], path)
  return next
}
