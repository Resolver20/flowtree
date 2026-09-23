# React architecture

This guide applies React's official recommendations to Flowtree's current JavaScript/JSX application.

## Component and data flow

```text
main.jsx
  StrictMode
    App.jsx
      useFlowData() -> persisted income, buffer, tree, transactions
      features/flowtree/EnergyExplorer.jsx
        flowTree.js -> tree lookup and monthly totals
        energyFlow.js -> allocation preview
        treeLayout.js -> pure coordinates and connectors
        TreeCanvas.jsx -> hierarchy presentation
```

React recommends breaking a UI into components around responsibilities and keeping the smallest complete representation of state. In Flowtree, the financial tree is the model, allocation is derived data, and the canvas is its presentation.

## State ownership

| State | Owner | Reason |
| --- | --- | --- |
| `income`, `buffer`, `tree`, `transactions` | `useFlowData` / `App` | Persistent product data shared across views |
| current navigation `path` | `App` | Coordinates the active hierarchy with app actions |
| open dialog and form drafts | `App` | Page-level workflow state |
| `demo`, `expandAll`, measured viewport | `features/flowtree/EnergyExplorer` | Temporary view state used only by the tree screen |
| monthly totals, allocation ratios, remaining money | Derived during render | They can be computed from existing state and must not drift |
| connector paths and node coordinates | Derived during render | They depend on the tree, expansion state, and viewport |

Follow React's [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure): avoid contradictory, redundant, and duplicated state. If multiple components need to edit one value, lift it to their closest common owner as described in [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components).

## Component rules

- Components and Hooks must be pure during render.
- Treat props and state as immutable snapshots.
- Never mutate tree nodes or child arrays in place. Return new objects and arrays from update helpers.
- Call Hooks only at the top level of React components or custom Hooks.
- Keep stable IDs as React keys; never use a row index for editable tree nodes.
- Pass actions down as callbacks; do not let presentation components write directly to storage.
- Keep `App` as orchestration. When a region gains an independent responsibility or testable interaction, extract it into a focused component.
- Keep financial logic out of components. A calculation that can run without the DOM belongs in `src/domain/` and should have a Node test.

These rules follow React's [Rules of React](https://react.dev/reference/rules) and [Thinking in React](https://react.dev/learn/thinking-in-react).

## Effects and browser APIs

Effects are only for synchronization outside React.

Current valid uses:

- `useFlowData` writes current persistent data to `localStorage`.
- `useElementSize` observes the tree viewport with `ResizeObserver` and disconnects it during cleanup.

Do not use an Effect to compute totals, selected nodes, allocation output, status copy, or layout data. Compute those values during render. React's [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) recommends Effects for external systems and requires cleanup when subscribing or observing.

`src/main.jsx` intentionally uses `StrictMode`. Development may run render and Effect setup/cleanup an extra time to expose impure logic or missing cleanup; do not remove Strict Mode to hide those bugs. See React's [`StrictMode` reference](https://react.dev/reference/react/StrictMode).

## Tree rendering contract

- `path` is an array of IDs from a top-level category to the selected node.
- Normal mode always renders the root category column, plus one child column for every selected parent in `path`.
- Existing columns retain fixed horizontal anchors when another level opens.
- Full view performs a leaf-first traversal. Each leaf receives its own vertical slot, and each parent is centered between its first and last child.
- SVG connectors and HTML cards use the same coordinate system.
- Nodes with the same parent share one connector group so shared trunks are not drawn repeatedly.
- The full world scale is derived from viewport size and content dimensions and never exceeds `1`.
- A card's navigation button and its Edit/Add child controls are siblings, never nested buttons. This keeps navigation and management actions independent and valid HTML.

When adding tree behavior, preserve these contracts so newly added items cannot create connector crossings or move unrelated branches.

## Forms and events

- Use controlled fields when React must coordinate the current draft; use form submission and `FormData` for simple one-shot fields.
- Validate and normalize numbers at the action boundary.
- Amounts must be finite and non-negative before entering persistent state.
- Use event handlers for actions caused by the user; do not model button clicks through Effects.
- Keep dialog close, submit, and error behavior keyboard accessible.

## Accessibility

- Prefer semantic `<button>`, `<nav>`, `<header>`, `<main>`, and `<footer>` elements.
- Every control must have an accessible name that describes its action.
- Keep focus indicators visible and do not make hover the only way to discover an action.
- The canvas is currently an interactive labeled region containing native buttons. Do not add `role="tree"` or `role="treeitem"` until arrow-key navigation, focus management, expanded state, selection state, and structural relationships are all implemented.
- If the complete ARIA tree pattern is adopted later, follow the [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) and test with keyboard and assistive technology.
- Pointer targets should be at least 24 by 24 CSS pixels or have sufficient spacing, following [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Testing strategy

Domain tests should cover:

- annual-to-monthly conversion;
- dormant and funded status handling;
- parent totals without double counting;
- ordered sibling funding;
- buffer-adjusted available income;
- parent-to-child allocation;
- conservation of allocated money;
- immutable nested updates and path lookup.

Browser checks should cover:

- persistent values surviving reload;
- opening and closing nested paths;
- adding a root item and a nested item;
- full view after adding multiple leaves to different branches;
- focus-visible behavior and button activation;
- full tree at desktop and narrow widths;
- reduced-motion preference.
