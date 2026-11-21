import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const loadConfig = require('next/dist/server/config').default
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

test('development proxy accepts DICOM ZIPs up to the backend upload limit', async () => {
  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, process.cwd())
  assert.equal(config.experimental.proxyClientMaxBodySize, 200 * 1024 * 1024)
})

async function devRewrites(env) {
  const saved = { ...process.env }
  Object.assign(process.env, { NODE_ENV: 'development' })
  for (const k of ['AUTH_ORIGIN', 'BACKEND_ORIGIN']) delete process.env[k]
  Object.assign(process.env, env)
  try {
    const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, process.cwd())
    return await config.rewrites()
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
    Object.assign(process.env, saved)
  }
}

const sources = (rules) => rules.map((r) => r.source)

test('/api/auth is rewritten to AUTH_ORIGIN before the generic /api catch-all', async () => {
  const rules = await devRewrites({ AUTH_ORIGIN: 'http://localhost:8082' })
  const auth = sources(rules).indexOf('/api/auth/:path*')
  const generic = sources(rules).indexOf('/api/:path*')
  assert.ok(auth >= 0, 'auth rewrite present')
  assert.ok(auth < generic, 'auth rewrite precedes /api/:path*')
  assert.equal(rules[auth].destination, 'http://localhost:8082/api/auth/:path*')
})

test('AUTH_ORIGIN defaults to BACKEND_ORIGIN, then to localhost:8081', async () => {
  const withBackend = await devRewrites({ BACKEND_ORIGIN: 'http://clinical:9000' })
  const a = withBackend.find((r) => r.source === '/api/auth/:path*')
  assert.equal(a.destination, 'http://clinical:9000/api/auth/:path*')

  const bare = await devRewrites({})
  const b = bare.find((r) => r.source === '/api/auth/:path*')
  assert.equal(b.destination, 'http://localhost:8081/api/auth/:path*')
})

test('generic /api still goes to BACKEND_ORIGIN and /internal is never proxied', async () => {
  const rules = await devRewrites({ AUTH_ORIGIN: 'http://localhost:8082' })
  const generic = rules.find((r) => r.source === '/api/:path*')
  assert.equal(generic.destination, 'http://localhost:8081/api/:path*')
  assert.ok(!sources(rules).some((s) => s.startsWith('/internal')))
  assert.ok(!rules.some((r) => r.destination.includes('/internal')))
})
