export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

// Headers CORS
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
    const { handleUpload } = await import('@vercel/blob/client')
    const token = (globalThis as any)?.process?.env?.BLOB_READ_WRITE_TOKEN as string | undefined

    if (!token) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.')
      return sendJSON(res, 500, {
        success: false,
        error: 'Storage is not configured. Please contact the administrator.'
      })
    }

    const body = await readJsonBody(req)
    const { images, sessionId: providedSessionId } = body || {}

    if (!images || !Array.isArray(images) || images.length === 0) {
      return sendJSON(res, 400, { error: 'images array is required' })
    }

    // Generar sessionId único
    const sessionId = providedSessionId || `ffz_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    console.log(`🔗 Generating ${images.length} signed URLs for session: ${sessionId}`)

    // Generar signed URLs para cada imagen
    const uploadPromises = images.map(async (img: any, index: number) => {
      const name = String(img.name || `frame_${index + 1}.png`)
      const hasExt = /\.[a-z0-9]+$/i.test(name)
      const filename = hasExt ? name : `${name}.png`
      const pathname = `ffz-direct/${sessionId}/images/${filename}`

      try {
        // Generar signed URL para upload directo
        const { url, fields } = await handleUpload({
          pathname,
          token,
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB max per image
          callbackUrl: undefined // No callback needed
        })

        return {
          index,
          filename,
          pathname,
          uploadUrl: url,
          fields,
          metadata: {
            id: `clip_${index + 1}`,
            filename,
            width: Number(img.width || 1920),
            height: Number(img.height || 1080),
            durationMs: 3000,
            transitionAfter: { pluginId: 'fade', durationMs: 500 }
          }
        }
      } catch (err) {
        console.error(`Error generating signed URL for ${filename}:`, err)
        throw new Error(`Failed to generate upload URL for ${filename}`)
      }
    })

    const uploadConfigs = await Promise.all(uploadPromises)

    console.log(`✅ Generated ${uploadConfigs.length} signed URLs for session: ${sessionId}`)

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      uploads: uploadConfigs,
      message: `Generated ${uploadConfigs.length} upload URLs`
    })

  } catch (error: any) {
    console.error('❌ Error generating signed URLs:', error)
    return sendJSON(res, 500, { 
      success: false, 
      error: error?.message || 'Error interno del servidor' 
    })
  }
}