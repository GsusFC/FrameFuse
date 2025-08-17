#!/usr/bin/env node

// Simple session fetcher for FrameFuse
// Usage examples:
//   scripts/get-session.mjs --sessionId=test-123
//   scripts/get-session.mjs --endpoint https://frame-fuse-web.vercel.app --sessionId abc

const DEFAULT_ENDPOINT = 'https://frame-fuse-web.vercel.app'

function parseArgs(argv) {
  const args = {}
  const arr = argv.slice(2)
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i]
    if (a === '--') continue
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    if (m) {
      const key = m[1]
      let val
      if (m[2] !== undefined) {
        val = m[2]
      } else if (arr[i + 1] && !arr[i + 1].startsWith('--')) {
        i++
        val = arr[i]
      } else {
        val = true
      }
      args[key] = val
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const endpoint = typeof args.endpoint === 'string' && args.endpoint ? args.endpoint : DEFAULT_ENDPOINT
  const sessionId = typeof args.sessionId === 'string' && args.sessionId ? args.sessionId : null
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