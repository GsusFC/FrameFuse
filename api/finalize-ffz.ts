import { zipSync, strToU8 } from 'fflate'

export const config = {
  runtime: 'nodejs',
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
    const { put, list } = await import('@vercel/blob')
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
    const { sessionId, totalImages } = body || {}

    // Validaciones
    if (!sessionId || typeof sessionId !== 'string') {
      return sendJSON(res, 400, { error: 'sessionId es requerido' })
    }

    if (typeof totalImages !== 'number' || totalImages <= 0) {
      return sendJSON(res, 400, { error: 'totalImages debe ser un número > 0' })
    }

    // Listar todos los metadatos subidos para esta sesión
    const metadataList = await list({
      prefix: `ffz-chunks/${sessionId}/metadata/`,
      token
    })

    if (metadataList.blobs.length !== totalImages) {
      return sendJSON(res, 400, { 
        error: `Expected ${totalImages} images, but found ${metadataList.blobs.length} metadata files. Upload incomplete.`
      })
    }

    console.log(`📦 Finalizing FFZ for session ${sessionId} with ${metadataList.blobs.length} images`)

    // Descargar todos los metadatos
    const metadataPromises = metadataList.blobs.map(async (blob) => {
      const response = await fetch(blob.url)
      const metadata = await response.json()
      const index = parseInt(blob.pathname.split('/').pop()?.split('.')[0] || '0')
      return { index, metadata }
    })

    const metadataResults = await Promise.all(metadataPromises)
    
    // Ordenar por índice
    metadataResults.sort((a, b) => a.index - b.index)

    const clips = metadataResults.map(({ metadata }) => ({
      id: metadata.id,
      filename: metadata.filename,
      width: metadata.width,
      height: metadata.height,
      durationMs: metadata.durationMs,
      transitionAfter: metadata.transitionAfter
    }))

    // Descargar todas las imágenes para crear el FFZ
    const imagePromises = metadataResults.map(async ({ metadata }) => {
      const response = await fetch(metadata.blobUrl)
      const arrayBuffer = await response.arrayBuffer()
      return {
        filename: metadata.filename,
        data: new Uint8Array(arrayBuffer)
      }
    })

    const images = await Promise.all(imagePromises)

    // Crear el project.json
    const project = {
      version: 1,
      fps: 30,
      width: Number(clips[0]?.width || 1920),
      height: Number(clips[0]?.height || 1080),
      clips
    }

    // Preparar archivos para el ZIP
    const filesToZip: Record<string, Uint8Array> = {}
    filesToZip['project.json'] = strToU8(JSON.stringify(project, null, 2))

    // Agregar todas las imágenes
    images.forEach(({ filename, data }) => {
      filesToZip[`images/${filename}`] = data
    })

    // Crear el FFZ (archivo ZIP)
    const ffzData = zipSync(filesToZip, { level: 6, mem: 8 })

    // Subir el FFZ final
    const ffzBlob = await put(`ffz-sessions/${sessionId}.ffz`, ffzData, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      token
    })

    console.log(`✅ FFZ finalized for session ${sessionId}: ${ffzData.length} bytes, ${images.length} images`)

    // Opcionalmente, limpiar los archivos temporales de chunks
    // (por ahora los dejamos para debugging)

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      blobUrl: ffzBlob.url,
      size: ffzData.length,
      imageCount: images.length,
      message: 'FFZ file created successfully from chunks'
    })

  } catch (error: any) {
    console.error('❌ Error finalizing FFZ:', error)
    return sendJSON(res, 500, { 
      success: false, 
      error: error?.message || 'Error interno del servidor' 
    })
  }
}