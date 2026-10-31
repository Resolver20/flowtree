import { parseFlowImport } from '../src/domain/flowDataTransfer.js'
import { boundedBody, googleFetch, json } from './security.js'

const API = 'https://www.googleapis.com/drive/v3'
const ID = '[A-Za-z0-9_-]{1,200}'
const filePath = new RegExp(`^/files/(${ID})$`)
const readPath = new RegExp(`^/(?:about|files(?:/${ID}(?:/revisions(?:/${ID})?)?)?)$`)
const folderMime = 'application/vnd.google-apps.folder'

async function metadata(id, token) {
  const response = await googleFetch(`${API}/files/${id}?fields=id,name,mimeType,parents,trashed`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw Object.assign(new Error('Drive unavailable'), { status: response.status === 401 ? 401 : 502 })
  return response.json()
}

async function requireFolder(id, token) {
  if (!new RegExp(`^${ID}$`).test(id || '')) throw Object.assign(new Error('Invalid folder'), { status: 400 })
  const folder = await metadata(id, token)
  if (folder.name !== 'gpt' || folder.mimeType !== folderMime || folder.trashed) throw Object.assign(new Error('Invalid folder'), { status: 403 })
}

export async function proxyDrive(request, token) {
  const url = new URL(request.url)
  const upload = url.pathname.startsWith('/api/upload/')
  const path = url.pathname.slice(upload ? '/api/upload'.length : '/api/drive'.length)
  // No arbitrary hosts, permissions endpoints, deletion, redirects or forwarded credentials.
  const allowedQuery = new Set(['fields', 'q', 'spaces', 'pageSize', 'orderBy', 'pageToken', 'alt', 'uploadType'])
  if (url.search.length > 6000 || [...url.searchParams.keys()].some(key => !allowedQuery.has(key) || url.searchParams.getAll(key).length !== 1)) return json({ error: { message: 'Unsupported Drive request.' } }, 400)
  let body
  if (request.method === 'GET' && !upload) {
    if (!readPath.test(path)) return json({}, 404)
  } else if (request.method === 'POST' && !upload && path === '/files') {
    const input = JSON.parse(await boundedBody(request, 1024))
    if (input.name !== 'gpt' || input.mimeType !== folderMime || Object.keys(input).some(key => !['name', 'mimeType'].includes(key))) return json({}, 400)
    body = JSON.stringify(input)
  } else if (upload && ((request.method === 'POST' && path === '/files') || (request.method === 'PATCH' && filePath.test(path)))) {
    if (url.searchParams.get('uploadType') !== 'multipart') return json({}, 400)
    const boundary = /^multipart\/related; boundary=([A-Za-z0-9-]{16,100})$/.exec(request.headers.get('Content-Type') || '')?.[1]
    if (!boundary) return json({}, 400)
    body = await boundedBody(request, 8_100_000)
    const parts = body.split(`--${boundary}`)
    if (parts.length !== 4 || parts[0] !== '' || parts[3] !== '--') return json({}, 400)
    const metaPart = /^\r\nContent-Type: application\/json; charset=UTF-8\r\n\r\n([\s\S]*)\r\n$/.exec(parts[1])
    const planPart = /^\r\nContent-Type: application\/json\r\n\r\n([\s\S]*)\r\n$/.exec(parts[2])
    if (!metaPart || !planPart) return json({}, 400)
    const meta = JSON.parse(metaPart[1])
    if (meta.name !== 'flowtree-plan.json' || meta.mimeType !== 'application/json' || Object.keys(meta).some(key => !['name', 'mimeType', 'parents'].includes(key))) return json({}, 400)
    parseFlowImport(planPart[1])
    if (request.method === 'POST') {
      if (!Array.isArray(meta.parents) || meta.parents.length !== 1) return json({}, 400)
      await requireFolder(meta.parents[0], token)
    } else {
      if (meta.parents) return json({}, 400)
      const file = await metadata(filePath.exec(path)[1], token)
      if (file.trashed || file.mimeType !== 'application/json' || !file.parents?.length) return json({}, 403)
      // Older valid backups can have a different name; explicit Save renames them.
      await requireFolder(file.parents[0], token)
    }
  } else return json({}, 405)
  const response = await googleFetch(`${upload ? 'https://www.googleapis.com/upload/drive/v3' : API}${path}${url.search}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': request.headers.get('Content-Type') || 'application/json' } : {}) },
    ...(body ? { body } : {}),
  })
  if (!response.ok) return json({ error: { message: `Google Drive request failed (${response.status}).` } }, response.status)
  return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' } })
}
