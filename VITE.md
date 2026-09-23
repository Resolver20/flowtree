# Vite development guide

Flowtree uses Vite as its development server and production bundler. The current configuration is deliberately small:

```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

Add configuration only when the application has a real requirement.

## Local development

Install exactly the locked dependencies on a clean checkout:

```sh
npm ci
```

Start development:

```sh
npm run dev
```

Use the URL Vite prints. Do not assume port `5173`; Vite may choose another available port. Additional CLI options such as `--host` and `--port` can be passed after `--` when needed.

Vite documents the standard `dev`, `build`, and `preview` scripts in its [Getting Started guide](https://vite.dev/guide/).

## Production verification

Build first, then preview the built output:

```sh
npm run build
npm run preview
```

`vite preview` is a local verification server, not a production server. The [Vite CLI guide](https://vite.dev/guide/cli) requires a current build before previewing.

The complete quality check is:

```sh
npm test
npm run lint
npm run build
```

## Assets

Prefer importing assets from `src/`:

```js
import imageUrl from './assets/example.png'
```

Imported assets enter Vite's build graph and receive production-safe URLs and hashed names. Use `public/` only for files that must keep an exact filename or are not imported by source code. Reference those files from the root, such as `/favicon.svg`, never `/public/favicon.svg`.

This follows Vite's [Static Asset Handling](https://vite.dev/guide/assets) guidance.

The Material Symbols font is currently loaded from Google Fonts in `EnergyExplorer.css`. If offline operation or stronger privacy guarantees become a requirement, self-host the selected icon font or replace it with bundled SVG components rather than silently changing icon metaphors.

## Environment variables

There are no required environment variables today.

If variables are added:

- Read client variables through `import.meta.env`.
- Only variables prefixed with `VITE_` are exposed to client code.
- Treat every `VITE_*` value as public because it is bundled into the browser application.
- Never place API secrets, private keys, database credentials, or privileged tokens in `VITE_*` variables.
- Put developer-specific values in `.env.local` or `.env.[mode].local` and keep `*.local` ignored by Git.
- Restart the dev server after changing an `.env` file.
- Convert string values explicitly when a boolean or number is required.

See Vite's [Env Variables and Modes](https://vite.dev/guide/env-and-mode).

## Deployment

The deployable artifact is `dist/` after `npm run build`.

Before choosing a host:

- confirm whether the app is served from `/` or a subpath;
- set Vite's `base` option only when the host needs a non-root public path;
- serve `index.html` for client entry requests;
- verify that imported assets and root-public assets load from the final URL;
- test persistence in the real deployment origin because `localStorage` is origin-specific;
- remember that this is currently a client-only app with no account sync or server backup.

## Troubleshooting

### The expected port does not open

Read the URL printed by `npm run dev`. If another process owns the port, either use Vite's selected port or start with an explicit available one.

### The preview looks stale

Stop the preview, run `npm run build`, and start `npm run preview` again. Preview serves built files and does not replace the dev server.

### A development-only Effect runs twice

This is expected under React Strict Mode. Fix missing cleanup or impure logic; do not remove Strict Mode.

### An asset works in development but not after deployment

Import source assets instead of constructing fragile paths, and verify the configured base path. Reserve `public/` for files that need stable names.
