#!/usr/bin/env node

// Simple uploader for FrameFuse FFZ upload endpoint
// Usage examples:
//   scripts/upload-ffz.mjs --data "Hello world" --sessionId test-123
//   scripts/upload-ffz.mjs --file ./path/to/file.ffz
//   scripts/upload-ffz.mjs --endpoint https://frame-fuse-web.vercel.app --data "Hi"

const DEFAULT_ENDPOINT = 'https://frame-fuse-web.vercel.app'

function parseArgs(argv) {
  const args = {}
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) args[m[1]] = m[2]
    else if (a.startsWith('--')) args[a.slice(2)] = true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const endpoint = args.endpoint || DEFAULT_ENDPOINT
  const url = `${endpoint.replace(/\/$/, '')}/api/upload-ffz`

  // Build ffzData (array of bytes)
  let buffer
  if (args.file) {
    const fs = await import('node:fs/promises')
    buffer = await fs.readFile(args.file)
  } else {
    const text = args.data ?? 'Hello from FrameFuse'
    buffer = Buffer.from(text, 'utf8')
  }
  const ffzData = Array.from(buffer.values())

  const payload = { ffzData }
  if (args.sessionId) payload.sessionId = args.sessionId

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()
  let body = text
  if (contentType.includes('application/json')) {
    try { body = JSON.parse(text) } catch {}
  }

  console.log('Status:', res.status)
  console.log('Headers:')
  for (const [k, v] of res.headers.entries()) console.log(`  ${k}: ${v}`)
  console.log('Body:')
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2))

  if (!res.ok) process.exit(1)
}

main().catch((err) => {
  console.error('Error:', err?.message || err)
  process.exit(1)
})