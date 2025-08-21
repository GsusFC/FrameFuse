// Endpoint de health check
export const config = {
  runtime: 'nodejs',
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function setCors(res: any) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v as string)
}

function sendJSON(res: any, statusCode: number, body: any) {
  setCors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.statusCode = statusCode
  res.end(JSON.stringify(body))
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.statusCode = 204
    res.end('')
    return
  }

  if (req.method !== 'GET') {
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }

  return sendJSON(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'framefuse-api',
    endpoints: [
      '/api/health',
      '/api/render',
      '/api/session/[id]',
      '/api/upload-ffz'
    ]
  })
}

