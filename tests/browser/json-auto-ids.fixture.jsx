import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from '/src/App.jsx'
import PlanDialog from '/src/features/flowtree/PlanDialog.jsx'
import '/src/index.css'
import '/src/features/flowtree/EnergyExplorer.css'

// Full App with synthetic data. Uses the real JSON dialog and parser; never
// signs in, uploads a plan, or writes this test data to browser storage.
const initial = {
  profile: { name: 'JSON preview' },
  incomeSources: [{ id: 'salary', name: 'Salary', amount: 60000 }],
  buffer: 0,
  tree: [{ id: 'needs', name: 'Cash Flow', children: [{ id: 'kept-bill', name: 'Existing bill', amount: 100 }] }],
}

export function Fixture() {
  const [plan, setPlan] = useState(initial)
  const [open, setOpen] = useState(true)
  const [revision, setRevision] = useState(0)
  return <div className="energy-mode theme-dark">
    <App key={revision} offlinePlan={plan} onSaveOfflinePlan={() => {}} />
    <button type="button" style={{ position: 'fixed', top: 8, left: '45%', zIndex: 30 }} onClick={() => setOpen(true)}>Edit test plan JSON</button>
    <output id="applied" hidden>{JSON.stringify(plan)}</output>
    {open && <PlanDialog dialog={{ type: 'editJson' }} {...plan} onClose={() => setOpen(false)} onApplyJson={next => {
      setPlan(next)
      setRevision(value => value + 1)
    }} />}
  </div>
}
createRoot(document.getElementById('root')).render(<Fixture />)
