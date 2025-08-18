import { zipSync, strToU8 } from 'fflate'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
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
    const { put, list } = await import('@vercel/blob')
    const token = (globalThis as any)?.process?.env?.BLOB_READ_WRITE_TOKEN as string | undefined

    if (!token) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.')
      return sendJSON(res, 500, {
        success: false,
        error: 'Storage is not configured. Please contact the administrator.'
      })
    }

    const body = await readJsonBody(req)
    const { sessionId, imageMetadata } = body || {}

    if (!sessionId || typeof sessionId !== 'string') {
      return sendJSON(res, 400, { error: 'sessionId es requerido' })
    }

    if (!imageMetadata || !Array.isArray(imageMetadata)) {
      return sendJSON(res, 400, { error: 'imageMetadata array es requerido' })
    }

    console.log(`📦 Finalizing direct FFZ for session ${sessionId} with ${imageMetadata.length} images`)

    // Verificar que todas las imágenes se subieron
    const imageList = await list({
      prefix: `ffz-direct/${sessionId}/images/`,
      token
    })

    if (imageList.blobs.length !== imageMetadata.length) {
      return sendJSON(res, 400, { 
        error: `Expected ${imageMetadata.length} images, but found ${imageList.blobs.length} uploaded files. Upload incomplete.`
      })
    }

    // Ordenar metadata por índice
    const sortedMetadata = imageMetadata
      .map((meta: any, index: number) => ({ ...meta, originalIndex: index }))
      .sort((a: any, b: any) => (a.index || a.originalIndex) - (b.index || b.originalIndex))

    // Crear project.json
    const clips = sortedMetadata.map((meta: any) => ({
      id: meta.id || `clip_${(meta.index || meta.originalIndex) + 1}`,
      filename: meta.filename,
      width: meta.width || 1920,
      height: meta.height || 1080,
      durationMs: meta.durationMs || 3000,
      transitionAfter: meta.transitionAfter || { pluginId: 'fade', durationMs: 500 }
    }))

    const project = {
      version: 1,
      fps: 30,
      width: Number(clips[0]?.width || 1920),
      height: Number(clips[0]?.height || 1080),
      clips
    }

    // Descargar todas las imágenes subidas
    const imagePromises = imageList.blobs.map(async (blob) => {
      const response = await fetch(blob.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${blob.pathname}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const filename = blob.pathname.split('/').pop() || 'image.png'
      return {
        filename,
        data: new Uint8Array(arrayBuffer)
      }
    })

    const images = await Promise.all(imagePromises)

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

    console.log(`✅ Direct FFZ finalized for session ${sessionId}: ${ffzData.length} bytes, ${images.length} images`)

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      blobUrl: ffzBlob.url,
      size: ffzData.length,
      imageCount: images.length,
      message: 'FFZ file created successfully from direct uploads'
    })

  } catch (error: any) {
    console.error('❌ Error finalizing direct FFZ:', error)
    return sendJSON(res, 500, { 
      success: false, 
      error: error?.message || 'Error interno del servidor' 
    })
  }
}