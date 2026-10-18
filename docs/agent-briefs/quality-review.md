# Quality-review workstream

Read `AGENTS.md` and the relevant implementation and tests. Work read-only unless the coordinator explicitly asks for a patch.

Find concrete correctness, regression, accessibility, test-coverage, and maintainability risks. Trace real code paths and report exact files, symbols, failing cases, and a suggested verification step. Do not give generic recommendations or redesign the product.

For domain changes, expect `npm test`, `npm run lint`, and `npm run build`. For visual or interaction changes, also require the browser checks listed in `AGENTS.md`.
