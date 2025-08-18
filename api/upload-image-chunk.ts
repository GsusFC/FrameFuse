export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
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
    const { put } = await import('@vercel/blob')
    const token = (globalThis as any)?.process?.env?.BLOB_READ_WRITE_TOKEN as string | undefined

    if (!token) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.')
      return sendJSON(res, 500, {
        success: false,
        error: 'Storage is not configured. Please contact the administrator.'
      })
    }

    // Validar content-type
    const contentType = String(req.headers['content-type'] || '')
    if (!contentType.includes('application/json')) {
      return sendJSON(res, 400, { error: 'Content-Type debe ser application/json' })
    }

    // Leer body como JSON
    const body = await readJsonBody(req)
    const { sessionId, imageIndex, image, totalImages } = body || {}

    // Validaciones
    if (!sessionId || typeof sessionId !== 'string') {
      return sendJSON(res, 400, { error: 'sessionId es requerido' })
    }

    if (typeof imageIndex !== 'number' || imageIndex < 0) {
      return sendJSON(res, 400, { error: 'imageIndex debe ser un número >= 0' })
    }

    if (typeof totalImages !== 'number' || totalImages <= 0) {
      return sendJSON(res, 400, { error: 'totalImages debe ser un número > 0' })
    }

    if (!image || !image.name || !image.data || !Array.isArray(image.data)) {
      return sendJSON(res, 400, { error: 'image debe contener name y data (array)' })
    }

    // Crear el path para la imagen individual
    const name = String(image.name || `frame_${imageIndex + 1}.png`)
    const hasExt = /\.[a-z0-9]+$/i.test(name)
    const filename = hasExt ? name : `${name}.png`
    const imagePath = `ffz-chunks/${sessionId}/images/${filename}`

    // Subir la imagen individual
    const imageData = new Uint8Array(image.data)
    const imageBlob = await put(imagePath, imageData, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      token
    })

    // También guardamos metadata de la imagen
    const metadata = {
      id: `clip_${imageIndex + 1}`,
      filename,
      width: Number(image.width || 1920),
      height: Number(image.height || 1080),
      durationMs: 3000,
      transitionAfter: { pluginId: 'fade', durationMs: 500 },
      blobUrl: imageBlob.url,
      size: imageData.length
    }

    const metadataPath = `ffz-chunks/${sessionId}/metadata/${imageIndex}.json`
    const metadataBlob = await put(metadataPath, JSON.stringify(metadata), {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      token,
      contentType: 'application/json'
    })

    console.log(`✅ Image chunk uploaded: ${sessionId}/${imageIndex} (${imageData.length} bytes)`)

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      imageIndex,
      filename,
      size: imageData.length,
      imageUrl: imageBlob.url,
      metadataUrl: metadataBlob.url,
      message: `Image ${imageIndex + 1}/${totalImages} uploaded successfully`
    })

  } catch (error: any) {
    console.error('❌ Error uploading image chunk:', error)
    return sendJSON(res, 500, { 
      success: false, 
      error: error?.message || 'Error interno del servidor' 
    })
  }
}