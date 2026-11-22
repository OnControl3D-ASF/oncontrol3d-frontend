import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'

// AKS routes at the edge (/api/auth -> auth, /api -> clinical, / -> frontend), so the browser
// must call same-origin relative URLs. NEXT_PUBLIC_API_URL is inlined at BUILD time: if it
// were set anywhere in the image build or the manifests, an absolute origin would be baked in.

const require = createRequire(import.meta.url)
const loadConfig = require('next/dist/server/config').default
const { PHASE_PRODUCTION_BUILD } = require('next/constants')

const ROOT = process.cwd()
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

test('production build has no rewrites: AUTH_ORIGIN/BACKEND_ORIGIN never reach the deployed server', async () => {
  const saved = { ...process.env }
  Object.assign(process.env, { NODE_ENV: 'production', AUTH_ORIGIN: 'http://auth.example:8082', BACKEND_ORIGIN: 'http://clinical.example:8081' })
  try {
    const config = await loadConfig(PHASE_PRODUCTION_BUILD, ROOT)
    assert.deepEqual(await config.rewrites(), [])
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
    Object.assign(process.env, saved)
  }
})

test('source code hard-codes no absolute http(s) origin (same-origin only)', () => {
  const allowed = [/^http:\/\/www\.w3\.org\/2000\/svg$/] // SVG namespace, not an origin
  const offenders = []
  for (const file of walk(join(ROOT, 'src'))) {
    if (!/\.(tsx?|mjs|jsx?)$/.test(file) || /\.test\.mjs$/.test(file)) continue
    // lung-surface-url.mjs is the sanitizer that REMOVES localhost origins: it names them on purpose
    if (file.endsWith('lung-surface-url.mjs')) continue
    for (const m of readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
      if (m[0].startsWith('//')) continue
      if (!allowed.some((re) => re.test(m[0]))) offenders.push(`${relative(ROOT, file)}: ${m[0]}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test('deployment artifacts never set NEXT_PUBLIC_API_URL or AUTH_ORIGIN (relative URLs in the bundle)', () => {
  const files = ['Dockerfile']
  if (existsSync(join(ROOT, 'deploy'))) {
    files.push(...walk(join(ROOT, 'deploy')).map((f) => relative(ROOT, f)))
  }
  for (const wf of existsSync(join(ROOT, '.github/workflows')) ? readdirSync(join(ROOT, '.github/workflows')) : []) {
    files.push(`.github/workflows/${wf}`)
  }
  for (const f of files) {
    // comments may mention the names; assignments/values may not
    const code = read(f).split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')
    assert.ok(!/NEXT_PUBLIC_API_URL|AUTH_ORIGIN|BACKEND_ORIGIN/.test(code), `${f} must not set an API origin`)
  }
})

test('next.config builds a standalone server (node server.js, no devDependencies at runtime)', async () => {
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, ROOT)
  assert.equal(config.output, 'standalone')
})

test('Dockerfile runs the standalone server as uid 1000 without npm', () => {
  const df = read('Dockerfile')
  assert.match(df, /^CMD \["node", "server\.js"\]$/m)
  assert.match(df, /^USER (node|1000)(:\S+)?$/m)
  assert.match(df, /\.next\/standalone/)
  assert.match(df, /\.next\/static/)
  assert.ok(!/^CMD .*npm/m.test(df), 'runtime must not go through npm')
})
