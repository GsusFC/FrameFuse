import { list, get } from '@vercel/blob'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).send('')
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const id = req.query?.id || req.params?.id
    const sessionId = Array.isArray(id) ? id[0] : id
    if (!sessionId) return res.status(400).set(CORS_HEADERS).json({ error: 'Missing session id' })

    const prefix = `ffz-sessions/${sessionId}.ffz`
    const blobs = await list({ prefix })

    const found = blobs.blobs.find(b => b.pathname === prefix)
    if (!found) return res.status(404).set(CORS_HEADERS).json({ error: 'Not found' })

    // Optionally, we could stream the content or just return metadata
    // For now, return the public blob URL so the client can fetch it
    return res.status(200).set(CORS_HEADERS).json({
      success: true,
      sessionId,
      blobUrl: found.url,
      size: found.size,
      uploadedAt: found.uploadedAt,
      pathname: found.pathname,
    })
  } catch (error: any) {
    console.error('❌ Error fetching session:', error)
    return res.status(500).set(CORS_HEADERS).json({ success: false, error: error?.message || 'Internal server error' })
  }
}