# FlowTree technical architecture

## Overview

FlowTree is a browser-first React application. It has no custom backend: users can keep their plan in their own Google Drive through the Drive API. The active stack is React 19, Vite, JavaScript/JSX, Node's built-in test runner, and Oxlint.

```text
Browser
  React UI
    App - orchestration, dialogs, Drive lifecycle
    EnergyExplorer - page-level navigation and derived view state
      TreeCanvas - interactive money-flow tree
      LoansView - loan payoff projection and amortization table
      GoalsView - dedicated life-goal authoring and overview
      TreeHeader - application navigation and account menu
  Domain modules - pure calculation and immutable tree updates
  Session memory - active plan while the tab is open
       |
       | optional OAuth with Google Identity Services
       v
Google Drive
  FlowTree/flowtree-plan.json
```

## Data and ownership

`App.jsx` owns the plan data and persistence boundary. `useFlowData` keeps the active plan in React memory only. It explicitly removes old `flowtree-v2` and `flowtree-data` local-storage keys, so closing the tab does not retain a financial-plan copy in the browser.

The plan consists of a profile marker, income sources, a monthly safety buffer, a nested destination tree, and optional loan metadata on debt nodes. Parent totals are always derived from direct amounts plus descendants. No calculated totals are persisted as separate state.

## Core calculations

- `flowTree.js` converts yearly targets into monthly requirements, calculates annual-target progress, and updates the tree immutably.
- `energyFlow.js` allocates income in sibling priority order after reserving the safety buffer.
- `loan.js` calculates a fixed-rate monthly payment and an amortization schedule. Extra monthly principal is included in the projection and can reduce projected payoff time and interest.

The financial model is a planning preview. It does not initiate payments, inspect a bank balance, or verify lender statements.

## Google Drive flow

1. The user explicitly starts Google sign-in from the profile menu.
2. Google Identity Services grants an in-memory access token using `drive.file` scope.
3. The app reads the current Drive user, finds or creates the private `FlowTree` folder, and finds `flowtree-plan.json`.
4. If that file exists, it is validated and loaded. Otherwise, a clean plan is created and uploaded.
5. Subsequent changes are debounced and uploaded to the same Drive file.

Only the Drive session reference is held in session storage. No Google credential or financial-plan copy is written to browser local storage.

## Import validation

`flowDataTransfer.js` validates all imported or Drive-restored JSON before it replaces the active plan. It rejects malformed JSON, duplicate IDs, negative or non-finite money values, invalid dates, unsupported statuses, invalid loan fields, excessive depth, and excessive node counts.

## UI architecture

`EnergyExplorer` selects one focused view at a time:

- **Home**: interactive left-to-right hierarchy;
- **Sinking funds**: yearly targets in the same tree shape;
- **Loans**: payoff detail and schedule for Debt Commitments;
- **Life goals**: goal authoring with Home-plan reflection;
- **Full tree overview**: expanded hierarchy layout.

The Home root is deliberately non-interactive and always expanded. Only category and destination branches control progressive disclosure. The tree layout uses a measured viewport, fixed hierarchy columns, disjoint subtree bands, and SVG connectors. The layout is derived at render time and centered after scaling.

`TreeHeader` keeps appearance and account actions together in the profile menu: optional Drive sign-in and account switching, direct JSON editing for a connected account, and the light/dark theme control. The signed-in user's Drive profile photo is also passed to `TreeCanvas` for the Home person marker, with a generic icon fallback. `TreeNodeCard` and `PlanDialog` derive the same semantic color from `nodePresentation.js`, so a card's info control and its detail-view icon stay visually matched.

## Build and deployment

GitHub Actions builds Vite with the `/flowtree/` base path and publishes the `dist/` directory to GitHub Pages. The public Google OAuth client ID is supplied at build time through the repository variable `GOOGLE_OAUTH_CLIENT_ID`.

## Quality checks

```sh
npm test
npm run lint
npm run build
```

Domain tests cover allocation priority, tree operations, yearly target pacing, data transfer validation, and loan payoff behavior. Browser checks complement these tests for responsive layout and interactive controls.
