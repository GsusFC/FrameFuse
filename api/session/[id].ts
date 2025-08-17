import { list } from '@vercel/blob'

// Configuración de runtime para Vercel Function
export const config = {
  runtime: 'nodejs20.x',
  regions: ['iad1', 'cdg1'],
  maxDuration: 30,
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
  try {
    const id = req.query?.id || req.params?.id
    const sessionId = Array.isArray(id) ? id[0] : id
    if (!sessionId) return sendJSON(res, 400, { error: 'Missing session id' })

    const prefix = `ffz-sessions/${sessionId}.ffz`
    const blobs = await list({ prefix })

    const found = blobs.blobs.find(b => b.pathname === prefix)
    if (!found) return sendJSON(res, 404, { error: 'Not found' })

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      blobUrl: found.url,
      size: found.size,
      uploadedAt: found.uploadedAt,
      pathname: found.pathname,
    })
  } catch (error: any) {
    console.error('❌ Error fetching session:', error)
    return sendJSON(res, 500, { success: false, error: error?.message || 'Internal server error' })
  }
}