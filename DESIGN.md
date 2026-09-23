# Flowtree design system

Flowtree should feel like a calm planning canvas, not a dashboard packed with widgets. The hierarchy itself is the main visual: income starts on the left, categories sit in the next column, and child destinations unfold to the right.

## Design principles

1. **Clarity before decoration.** Every visible element should explain hierarchy, amount, state, or action.
2. **Progressive disclosure first.** Show the whole category overview initially and reveal deeper destinations only when requested.
3. **Stable spatial memory.** Opening a branch must not move unrelated nodes.
4. **Color carries meaning.** Keep surfaces neutral; use color primarily for category and destination icons and their branch identity.
5. **Numbers stay readable.** Display exact Indian-formatted monthly amounts without compact `k` abbreviations.
6. **Planning language stays honest.** Targets and available amounts are planning figures, not verified balances or savings.

## Information hierarchy

```text
Your income
  Category
    Destination
      Child destination
```

Current planning categories are:

- Cash Flow
- Debt Commitments
- Emergency Fund
- Risk Protection
- Tax Obligations
- Life goals
- Long-Term Growth

Category labels describe the financial purpose. Child labels describe the actual destination. Emergency recurring deposits belong under Emergency Fund; insurance belongs under Risk Protection; property tax belongs under Tax Obligations.

## Canvas and layout

- Use a light neutral canvas (`#f7f8fa`) and white node surfaces.
- Keep the root income node circular and visually distinct from rectangular destination cards.
- Lay out the hierarchy from left to right.
- Use consistent fixed column spacing so connectors have room for one controlled elbow.
- Node cards are approximately `196 x 56px`, with a `12px` radius and a thin cool-gray border.
- Keep the tree inside the available canvas. Full view may scale down uniformly; do not introduce page scrolling solely to see the tree.
- Center the visible tree as one scaled unit in both axes, including **Expand everything**. Center the transformed bounds, not the unscaled layout box, so browser zoom and narrow viewports cannot make the tree appear left- or top-aligned.
- Full view assigns every leaf a separate vertical slot and centers each parent across its first and last child. This keeps subtrees disjoint as new items are added.
- The header, breadcrumbs, options control, and status footer stay outside the scaled tree world.

## Node anatomy

Each destination card contains:

1. a colored Material Symbol;
2. a concise destination name;
3. the exact monthly target, for example `₹2,550 /mo`.
4. compact **Edit** and **Add child** controls when the card is hovered, focused, or selected.

Rules:

- The category icon must differ from each child's icon when their meanings differ.
- Use the icon mapping in `materialIconFor()` before adding new metaphors.
- Use one icon family consistently; do not mix emoji, filled illustrations, and outline symbols.
- Do not show numbering badges, stacked-card layers, destination-count text, glow, heavy elevation, or decorative fill effects.
- Selected nodes may use a slightly darker border and very light tinted surface.
- Keep management controls visually quiet until a user engages the card; they must become visible on keyboard focus as well as hover.
- Long labels should wrap or truncate deliberately without pushing the amount out of the card.

## Color system

Core tokens:

| Role | Value |
| --- | --- |
| Canvas | `#f7f8fa` |
| Surface | `#ffffff` |
| Primary text | `#252a34` |
| Amount text | `#293444` |
| Muted text | `#737b88` |
| Border | `#d9dde4` |
| Card border | `#dce1e8` |
| Connector | `#c8ced8` |
| Focus/accent | `#5f739d` |
| Selected border | `#71809a` |

Category icon colors:

| Category | Color |
| --- | --- |
| Cash Flow | `#2563eb` |
| Debt Commitments | `#7c3aed` |
| Emergency Fund | `#d97706` |
| Risk Protection | `#dc2626` |
| Tax Obligations | `#0891b2` |
| Life goals | `#db2777` |
| Long-Term Growth | `#16a34a` |

Child icons may use a recognizable service or purpose color, but card surfaces remain white. Do not use color alone to communicate selection, funding, or errors.

## Connectors

- Connectors are thin, low-contrast SVG strokes behind the cards.
- A line starts at the center of the parent's right edge and ends at the center of the child's left edge.
- Use a mostly orthogonal path with small rounded corners only where a right angle would occur.
- Do not use broad curves or decorative arcs.
- Siblings share one parent trunk; render grouped path segments so the trunk is not darkened by duplicate strokes.
- In full view, use neutral gray for the income trunk and the root category color for descendants.
- Lines must never cross node cards or neighboring subtree bands.

## Interaction

- Clicking a parent reveals its children in the next column.
- Clicking the selected parent returns to its parent level.
- Each destination exposes **Edit** and **Add child** controls on hover, focus, or selection. These actions do not change the navigation path.
- The initial income node is not navigable; its separate pencil control opens monthly-income editing.
- Breadcrumbs provide explicit return paths.
- The Options menu contains infrequent actions: edit income, edit safety buffer, add a destination, expand/collapse everything, and sample mode.
- Do not add browser-like forward/back controls.
- The full-view action must clearly change between **Expand everything** and **Collapse everything**.
- Hover may strengthen a border, but every action must remain understandable by label, structure, focus, and accessible name.
- Motion is optional and restrained. Respect `prefers-reduced-motion` and never use ambient animation for financial transfer claims.

## Plan summary and balance language

Keep one compact summary near the income/status area:

```text
Income ₹50,000  ·  Planned ₹46,466  ·  Available ₹3,534
```

When planned money plus buffer exceeds income:

```text
Over-planned by ₹4,000
```

Calculation:

```text
available = income - safety buffer - total monthly targets
```

- Do not repeat the summary on every node.
- Use green only for a healthy available state and restrained red/orange for over-planned state.
- Do not call the result a bank balance because Flowtree does not read an account.

## Responsive behavior

- Preserve the same information hierarchy on desktop, tablet, and mobile.
- Scale the world uniformly when necessary so cards and connectors stay aligned.
- Keep card text readable; if a very large tree becomes too small in full view, progressive disclosure remains the primary detailed view.
- Keep corner controls inside safe viewport gutters.
- Mobile controls must remain at least 24 by 24 CSS pixels or have enough separation to satisfy [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Test the smallest supported width of `320px`, landscape mobile, a normal laptop viewport, and a large desktop viewport.

## Accessibility

- Maintain text contrast of at least 4.5:1 for normal text.
- Keep a visible focus outline with enough contrast against both canvas and white surfaces.
- Do not hide information only in hover tooltips.
- Keep amount formatting available in accessible names.
- The visual is a hierarchy, but it should remain a group of native buttons inside a labeled region until the complete [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) is implemented.
- Selected appearance and keyboard focus are separate states and must remain visually distinguishable.

## Design review checklist

- Is the income source immediately recognizable as the starting point?
- Are category cards and child cards visually consistent but semantically distinct through icon and placement?
- Are exact monthly amounts readable without dominating names?
- Do newly added items receive unique vertical space in full view?
- Do all lines meet card centers without overlap or crossings?
- Does opening one branch keep the other nodes stationary?
- Does the complete tree fit the canvas without page scrolling?
- Is the complete expanded tree visibly centered at normal browser zoom and after zooming out?
- Are focus, selected, hover, available, and over-planned states distinguishable?
- Is every label honest about planned versus actual money?
- Does the screen still feel calm after adding more items?

## References

- [Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols)
- [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- [WCAG 2.2 updates](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
