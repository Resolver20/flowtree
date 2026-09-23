# Flowtree contributor instructions

This file defines how coding agents should work in this repository. It is intentionally project-specific. Use `README.md` for setup, `REACT.md` for React architecture, `VITE.md` for tooling, and `DESIGN.md` for the accepted interface system.

## Product and stack

Flowtree is a browser-local monthly planning tool. It visualizes:

`income -> planning categories -> child destinations`

The active stack is plain JavaScript and JSX, React 19, Vite, component-scoped CSS, Node's built-in test runner, and Oxlint. Do not introduce TypeScript, a router, a state library, a CSS framework, a component library, or a backend unless the user requests it and the change has a concrete benefit.

## Source of truth

When documents disagree, use this order:

1. The user's latest request.
2. Current working behavior verified in the browser.
3. `DESIGN.md` for visual and interaction decisions.
4. `REACT.md` and `VITE.md` for implementation conventions.
5. `README.md` for the product overview and commands.

Do not revive older visual experiments from unused files unless the user asks for them.

## Active code

| File | Responsibility |
| --- | --- |
| `src/App.jsx` | Persistent app state, dialogs, page-level actions, and composition |
| `src/features/flowtree/` | Active tree screen, components, presentation helpers, layout, and styles |
| `src/domain/flowTree.js` | Tree model, monthly equivalents, totals, immutable tree updates, and migration |
| `src/domain/energyFlow.js` | Pure ordered allocation preview |
| `src/hooks/useFlowData.js` | Local storage boundary and persistent mutations |
| `src/domain/*.test.js` | Domain behavior tests |

The earlier prototype screens and styles were removed. Confirm imports before editing any file.

## Product invariants

- The tree is a plan preview, not a bank balance, transfer system, or proof of savings.
- All displayed targets are monthly equivalents. Divide annual amounts by 12.
- The safety buffer is reserved before category allocation.
- Sibling array order is funding priority.
- A parent total includes its own direct amount and all descendants. Never count parent and child totals as separate money.
- A parent reserves its own direct amount before passing its allocated remainder to children.
- `dormant` and `funded` nodes currently consume no allocation.
- Demo mode must never write demo values to persistent data.
- Positive post-plan money is **Available** or **Unassigned**. A negative result is **Over-planned**. Never label either value as an actual account balance.
- Saved data remains browser-local under `flowtree-v2`; preserve migration from `flowtree-data`.

## Working rules

Before editing:

- Read the relevant source and this repository's documentation.
- Check `git status` and preserve unrelated user changes.
- Inspect the current browser state for visual work.
- Treat the most recently accepted design as the baseline.

While editing:

- Make the smallest coherent change that solves the request.
- Keep financial calculations in pure domain modules, not JSX or CSS.
- Derive totals, remaining money, percentages, and layout data from existing state during render; do not store duplicate derived state.
- Keep persistent state owned by `App`/`useFlowData`; keep view-only state near the component that uses it.
- Update arrays and objects immutably.
- Use Effects only to synchronize with external systems such as `localStorage` or `ResizeObserver`, and always clean up subscriptions or observers.
- Keep Hooks at the top level of React components or custom Hooks.
- Prefer native HTML semantics. Every icon-only action needs an accessible name.
- Do not apply ARIA `tree`/`treeitem` roles until the full keyboard behavior described by the WAI-ARIA Tree View Pattern is implemented and tested.
- Preserve keyboard-visible focus, readable contrast, and usable pointer targets.
- Avoid new animation unless it explains a state change; honor `prefers-reduced-motion`.

For design work:

- Preserve the minimal whitish canvas, colored icons, white node cards, thin connectors, and left-to-right hierarchy.
- Keep nodes stable when progressively revealing a branch.
- In full view, assign disjoint vertical bands to subtrees and fit the world to the viewport. Connectors must meet card centers and must not cross neighboring branches.
- Treat visible centering as a UX invariant: center the transformed tree bounds in both axes in every view, especially **Expand everything** and browser zoom. Do not rely on centering an unscaled layout box.
- Do not reintroduce stacked-card effects, decorative gradients, glow, heavy shadows, priority numbers, destination-count labels, or forward/back shortcuts.
- Minor refinements inside this established system do not require a new image-generated concept. A broad redesign requires an explicit design direction and user approval before implementation.

## Required validation

For logic changes:

```sh
npm test
npm run lint
npm run build
```

For visual or interaction changes, also verify in the browser:

- default whole-tree view;
- opening and closing nested branches;
- **Expand everything** at a normal desktop viewport;
- a narrow/mobile viewport;
- keyboard focus and activation;
- long labels, large Indian-formatted amounts, and newly added nodes;
- no clipping, unintended scrolling, connector overlap, or connector/card misalignment.

Do not claim a viewport or interaction is verified unless it was actually checked.

## Reference standards

- [React: Rules of React](https://react.dev/reference/rules)
- [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Vite: Getting Started](https://vite.dev/guide/)
- [WAI-ARIA Authoring Practices: Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [WCAG 2.2: What's New](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
