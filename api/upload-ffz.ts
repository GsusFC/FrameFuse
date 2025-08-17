// import { put } from '@vercel/blob'

// Configuración de runtime para Vercel Function
export const config = {
  runtime: 'nodejs20.x',
  regions: ['iad1', 'cdg1'],
  maxDuration: 30,
}

// Headers CORS para permitir requests desde el plugin de Figma
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function setCors(res: any) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v)
}

function sendJSON(res: any, statusCode: number, body: any) {
  setCors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.statusCode = statusCode
  res.end(JSON.stringify(body))
}

async function readJsonBody(req: any): Promise<any> {
  // Acumular como string para evitar dependencia de Buffer
  req.setEncoding && req.setEncoding('utf8')
  let raw = ''
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: string) => { raw += chunk })
    req.on('end', () => resolve())
    req.on('error', (err: any) => reject(err))
  })
  try { return raw ? JSON.parse(raw) : {} } catch {
    return raw
  }
}

export default async function handler(req: any, res: any) {
  // Manejar preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.statusCode = 204
    res.end('')
    return
  }

  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }

  try {
    // Import dinámico para compatibilidad ESM/CJS
    const { put } = await import('@vercel/blob')

    // Validar content-type
    const contentType = String(req.headers['content-type'] || '')
    if (!contentType.includes('application/json')) {
      return sendJSON(res, 400, { error: 'Content-Type debe ser application/json' })
    }

    // Leer body como JSON
    const body = await readJsonBody(req)
    const { ffzData, sessionId: providedSessionId } = body || {}

    // Validar que ffzData existe y es un array
    if (!ffzData || !Array.isArray(ffzData)) {
      return sendJSON(res, 400, { error: 'ffzData debe ser un array de números' })
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

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      blobUrl: blob.url,
      size: ffzBuffer.length,
      message: 'FFZ file uploaded successfully',
    })
  } catch (error: any) {
    console.error('❌ Error uploading FFZ:', error)
    return sendJSON(res, 500, { success: false, error: error?.message || 'Error interno del servidor' })
  }
}