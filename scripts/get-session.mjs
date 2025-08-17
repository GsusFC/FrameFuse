#!/usr/bin/env node

// Simple session fetcher for FrameFuse
// Usage examples:
//   scripts/get-session.mjs --sessionId test-123
//   scripts/get-session.mjs --endpoint https://frame-fuse-web.vercel.app --sessionId abc

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
  const sessionId = args.sessionId
  if (!sessionId) {
    console.error('Missing required --sessionId')
    process.exit(2)
  }
  const url = `${endpoint.replace(/\/$/, '')}/api/session/${encodeURIComponent(sessionId)}`

  const res = await fetch(url)
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