import { put } from '@vercel/blob'

// Headers CORS para permitir requests desde el plugin de Figma
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: any, res: any) {
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res
      .status(200)
      .set(CORS_HEADERS)
      .send('')
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validar content-type
    const contentType = req.headers['content-type'] || ''
    if (!contentType.includes('application/json')) {
      return res.status(400).set(CORS_HEADERS).json({ error: 'Content-Type debe ser application/json' })
    }

    // Asegurar que tenemos el body como objeto
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    const { ffzData, sessionId: providedSessionId } = body || {}

    // Validar que ffzData existe y es un array
    if (!ffzData || !Array.isArray(ffzData)) {
      return res.status(400).set(CORS_HEADERS).json({ error: 'ffzData debe ser un array de números' })
    }

    // Generar sessionId único o usar el proporcionado
    const sessionId = providedSessionId || `ffz_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    // Convertir array de números a Uint8Array
    const ffzBuffer = new Uint8Array(ffzData)

    // Subir a Vercel Blob con pathname que incluye el sessionId
    const blob = await put(`ffz-sessions/${sessionId}.ffz`, ffzBuffer, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
    })

    console.log('✅ FFZ uploaded to blob storage:', { sessionId, url: blob.url, size: ffzBuffer.length })

    return res.status(200).set(CORS_HEADERS).json({
      success: true,
      sessionId,
      blobUrl: blob.url,
      size: ffzBuffer.length,
      message: 'FFZ file uploaded successfully',
    })
  } catch (error: any) {
    console.error('❌ Error uploading FFZ:', error)
    return res.status(500).set(CORS_HEADERS).json({ success: false, error: error?.message || 'Error interno del servidor' })
  }
}