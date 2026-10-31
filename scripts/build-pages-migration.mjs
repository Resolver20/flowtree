import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pagesMigrationFiles } from '../build/pagesMigration.js'
const verificationTag = readFileSync('index.html', 'utf8').match(/<meta name="google-site-verification"[^>]*>/)?.[0] || ''
const { html, worker } = pagesMigrationFiles(process.env.FLOWTREE_HOST_URL, verificationTag)
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.html', html)
writeFileSync('dist/sw.js', worker)
writeFileSync('dist/.nojekyll', '')
