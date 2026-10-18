# Quality-review workstream

Read `AGENTS.md` and the relevant implementation and tests. Work read-only unless the coordinator explicitly asks for a patch.

Find concrete correctness, regression, accessibility, test-coverage, and maintainability risks. Trace real code paths and report exact files, symbols, failing cases, and a suggested verification step. Do not give generic recommendations or redesign the product.

For domain changes, expect `npm test`, `npm run lint`, and `npm run build`. For visual or interaction changes, also require cross-device browser checks: phone portrait, phone landscape, tablet, normal laptop, and wide desktop. At each relevant viewport, check clipping, horizontal and vertical scrolling, connector/card alignment, safe-area spacing, keyboard focus and activation, long labels, and large Indian-formatted amounts. Report the exact viewport sizes actually checked; never call a change cross-device verified when only one display size was tested.
