import { useRef } from 'react'

export default function TreeHeader({ breadcrumbs, demo, expandAll, driveStatus, onReturnToRoot, onNavigate, onAddIncomeSource, onManageAnnualTargets, onEditBuffer, onAddChild, onExportJson, onImportJson, onToggleExpandAll, onToggleDemo, onManageDrive }) {
  const importRef = useRef(null)

  function runMenuAction(event, action) {
    action()
    event.currentTarget.closest('details')?.removeAttribute('open')
  }

  return <>
    <header className="energy-corner">
      <button className="energy-brand" onClick={onReturnToRoot} aria-label="Return to whole tree">✳ <span>Flowtree</span></button>
      <span className="energy-mode-label">{demo ? 'DEMO · NOT SAVED' : 'MONTHLY PLAN PREVIEW'}</span>
    </header>
    <details className="energy-menu">
      <summary aria-label="Open options">☰ <span>Options</span></summary>
      <div>
        <button onClick={event => runMenuAction(event, onAddIncomeSource)}>Add income source</button>
        <button onClick={event => runMenuAction(event, onManageAnnualTargets)}>Review yearly targets</button>
        <button onClick={event => runMenuAction(event, onEditBuffer)}>Safety buffer</button>
        <button onClick={event => runMenuAction(event, () => onAddChild(null))}>Add top-level category</button>
        <button onClick={event => runMenuAction(event, onToggleExpandAll)}>{expandAll ? 'Collapse everything' : 'Expand everything'}</button>
        <button onClick={event => runMenuAction(event, onToggleDemo)}>{demo ? 'Return to my plan' : 'Try a sample flow'}</button>
        <button className="menu-divider" onClick={event => runMenuAction(event, onExportJson)}>Export plan as JSON</button>
        <button onClick={event => runMenuAction(event, () => importRef.current?.click())}>Import plan from JSON</button>
        <button onClick={event => runMenuAction(event, onManageDrive)}>{driveStatus === 'connected' || driveStatus === 'saving' || driveStatus === 'saved' ? 'Google Drive sync' : 'Connect Google Drive'}</button>
        <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImportJson(file) }} />
        <small>Use the info button on any card to view and manage it. This view does not move money.</small>
      </div>
    </details>
    <nav className="energy-breadcrumbs" aria-label="Flow location">
      <button onClick={onReturnToRoot}>Whole tree</button>
      {breadcrumbs.map(crumb => <span key={crumb.node.id}> / <button onClick={() => onNavigate(crumb.path)}>{crumb.node.name}</button></span>)}
    </nav>
  </>
}
