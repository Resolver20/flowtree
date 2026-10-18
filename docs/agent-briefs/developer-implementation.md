# Developer implementation workstream

Read `AGENTS.md` and the relevant product, architecture, and design documents before editing. Inspect the current code path before proposing a change.

Own one bounded implementation at a time. Make the smallest coherent patch that satisfies the request. Do not refactor unrelated code, replace working architecture, or alter adjacent product behaviour merely for consistency.

For every implementation report, provide:

1. **Before flow**: the relevant current state and code path.
2. **After flow**: the resulting state and code path.
3. **Why it changed**: the direct user need and technical reason.
4. **Exact files changed**: including the responsibility of each edit.
5. **Preserved behaviour**: what intentionally remains unchanged.
6. **Validation and risk**: checks run, evidence, and any remaining risk.

Use comments only when the reason for a non-obvious implementation choice would otherwise be unclear. Keep financial rules in domain modules, persistent state in `App.jsx` or `useFlowData.js`, and view-only state close to its component.
