import { list } from '@vercel/blob'

// Configuración de runtime para Vercel Function
export const config = {
  runtime: 'nodejs',
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

    // Si se solicita descarga directa, proxyear el contenido para evitar problemas de COEP/CORS
    const download = (req.query?.download ?? req.query?.dl ?? '').toString()
    if (download && download !== '0' && download !== 'false') {
      try {
        const ffzRes = await fetch(found.url)
        if (!ffzRes.ok) throw new Error(`Upstream blob fetch failed: ${ffzRes.status}`)
        const B = (globalThis as any).Buffer
        const buf = B.from(await ffzRes.arrayBuffer())
        setCors(res)
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Length', String(buf.byteLength))
        res.setHeader('Content-Disposition', `inline; filename="${sessionId}.ffz"`)
        res.end(buf)
        return
      } catch (e: any) {
        console.error('❌ Error proxying FFZ download:', e)
        return sendJSON(res, 502, { success: false, error: 'Failed to download session FFZ' })
      }
    }

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