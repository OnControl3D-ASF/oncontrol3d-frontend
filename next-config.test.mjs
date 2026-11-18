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
