// import { put } from '@vercel/blob'
import { zipSync, strToU8 } from 'fflate'

// Configuración de runtime para Vercel Function
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
    const token = (globalThis as any)?.process?.env?.BLOB_READ_WRITE_TOKEN as string | undefined

    if (!token) {
      // Mensaje claro para operadores; evitar filtrar detalles innecesarios al cliente
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable. Configure it in the Vercel project (API).')
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
    const { ffzData, images, sessionId: providedSessionId } = body || {}

    // Generar sessionId único o usar el proporcionado
    const sessionId = providedSessionId || `ffz_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    // Determinar fuente del FFZ
    let finalFfz: Uint8Array | null = null
    if (ffzData && Array.isArray(ffzData)) {
      finalFfz = new Uint8Array(ffzData)
    } else if (images && Array.isArray(images) && images.length > 0) {
      // Construir FFZ desde imágenes crudas
      const filesToZip: Record<string, Uint8Array> = {}

      const clips = images.map((img: any, index: number) => {
        const name: string = String(img?.name || `frame_${index + 1}.png`)
        const hasExt = /\.[a-z0-9]+$/i.test(name)
        const filename = hasExt ? name : `${name}.png`
        return {
          id: `clip_${index + 1}`,
          filename,
          width: Number(img?.width || 1920),
          height: Number(img?.height || 1080),
          durationMs: 3000,
          transitionAfter: { pluginId: 'fade', durationMs: 500 }
        }
      })

      const project = {
        version: 1,
        fps: 30,
        width: Number(images?.[0]?.width || 1920),
        height: Number(images?.[0]?.height || 1080),
        clips
      }

      filesToZip['project.json'] = strToU8(JSON.stringify(project, null, 2))

      images.forEach((img: any, index: number) => {
        const name: string = String(img?.name || `frame_${index + 1}.png`)
        const hasExt = /\.[a-z0-9]+$/i.test(name)
        const filename = hasExt ? name : `${name}.png`
        const path = `images/${filename}`
        if (!img?.data || !Array.isArray(img.data)) {
          throw new Error(`Imagen inválida en índice ${index}: falta data[]`)
        }
        filesToZip[path] = new Uint8Array(img.data)
      })

      finalFfz = zipSync(filesToZip, { level: 6, mem: 8 })
      console.log('✅ FFZ generado en servidor desde imágenes:', { sessionId, size: finalFfz.length, imageCount: images.length })
    } else {
      return sendJSON(res, 400, { error: 'Debe proporcionar ffzData (number[]) o images (array)' })
    }

    // Subir a Vercel Blob con pathname que incluye el sessionId
    if (!finalFfz || !(finalFfz instanceof Uint8Array) || finalFfz.length === 0) {
      return sendJSON(res, 400, { error: 'FFZ vacío o inválido' })
    }
    const blob = await put(`ffz-sessions/${sessionId}.ffz`, finalFfz, {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      token
    })

    console.log('✅ FFZ uploaded to blob storage:', { sessionId, url: blob.url, size: finalFfz.length })

    return sendJSON(res, 200, {
      success: true,
      sessionId,
      blobUrl: blob.url,
      size: finalFfz.length,
      message: 'FFZ file uploaded successfully',
    })
  } catch (error: any) {
    console.error('❌ Error uploading FFZ:', error)
    return sendJSON(res, 500, { success: false, error: error?.message || 'Error interno del servidor' })
  }
}