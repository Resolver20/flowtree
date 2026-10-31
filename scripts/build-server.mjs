import { spawnSync } from 'node:child_process'
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit', env: { ...process.env, VITE_AUTH_MODE: 'server', VITE_BASE_PATH: '/' },
})
process.exit(result.status ?? 1)
