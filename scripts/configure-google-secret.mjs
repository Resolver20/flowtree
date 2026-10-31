import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// Read a locally downloaded Google Web-client JSON; never print the credential,
// put it in command arguments, or write it into the repository.
const path = process.argv[2]
if (!path) throw new Error('Provide the local path to the downloaded Google Web-client JSON.')
let credential
try { credential = JSON.parse(readFileSync(path, 'utf8')).web } catch { throw new Error('Could not read the Google Web-client JSON.') }
const expected = '739360473101-mi3ql0icmce2vr7jgttmdgoivse8s6ao.apps.googleusercontent.com'
if (credential?.client_id !== expected || typeof credential.client_secret !== 'string' || !credential.client_secret || credential.client_secret.length > 4096) throw new Error('The file must contain the configured Flowtree Web-client ID and its new client secret.')
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', 'GOOGLE_CLIENT_SECRET'], {
  input: credential.client_secret, encoding: 'utf8',
  env: { ...process.env, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', WRANGLER_SEND_METRICS: 'false' },
})
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
process.exit(result.status ?? 1)
