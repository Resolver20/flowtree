# AI Implementation Brief

Give this brief to an AI before asking it to change the app. Replace bracketed text and keep the request narrow.

```md
You are working in the existing Flowtree React 19 + Vite JavaScript app.

Goal: [one user-visible outcome]
Scope: [files/features that may change]
Do not change: [existing behavior, styling, storage/API contract, unrelated files]

Before coding:
1. Inspect the relevant files, `package.json`, and existing tests.
2. State the source of truth, component that owns state, derived values, and error/loading/empty states.
3. Reuse the current architecture and visual system. Do not add dependencies, a new state library, TypeScript, a backend, or a design-system rewrite unless I explicitly request it.

Implementation requirements:
- Keep business rules in `src/domain` as pure functions with tests.
- Keep browser storage/network calls in hooks or service adapters, not render functions.
- Use semantic accessible HTML and keyboard-operable controls.
- Preserve mobile behavior and `prefers-reduced-motion` support.
- Avoid duplicated state, unnecessary effects, magic numbers, dead code, and console logs.
- Handle [loading/empty/error/invalid input requirements].

Verification:
- Run `npm run build`, `npm run lint`, and `npm test`.
- Manually verify [exact click path] at desktop and a narrow mobile viewport.
- Report changed files, behavior, tests/checks run, and any deliberate limitation.
```

## Prompts that produce better results

Good: “Add an editable monthly target. Keep the allocation rules in `src/domain`, validate a non-negative finite number, save through the existing hook, and add unit tests for unchanged allocation behavior.”

Weak: “Make it more professional and fix everything.” It has no acceptance criteria, so an AI may make broad, incompatible changes.

For a design task, provide a screenshot or clear requirements and ask for: desktop/mobile layout, component states, exact copy, reuse of existing colors/type, and browser screenshot verification. Ask the AI to make one visual slice, compare it, then continue.

## Review questions after AI changes code

- Is there one clear owner for every changing value?
- Could a derived value be computed instead of stored?
- Did it add an effect that should be normal render logic or an event handler?
- Does the feature still work with empty/slow/bad data?
- Is the visible UI actually usable by mouse, keyboard, and phone?
- Did the AI introduce a dependency or unrelated rewrite without need?
- Does the diff include proof through tests and browser verification?
