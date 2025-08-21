import { spawn } from 'child_process';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// Usar FFmpeg directamente sin ffmpeg-static
const FFMPEG_PATH = '/usr/bin/ffmpeg';

// Configuración de runtime para Vercel Function
export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 5 minutos máximo para renderizado
}

// Headers CORS para permitir requests desde el frontend
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  let tempDir = ''

  try {
    console.log('🎬 Iniciando renderizado de video...')

    // Crear directorio temporal
    tempDir = path.join(tmpdir(), `framefuse-render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    await fs.mkdir(tempDir, { recursive: true })
    console.log('📁 Directorio temporal creado:', tempDir)

    // Leer el body de la request
    const body = await readJsonBody(req)
    const { project, format = 'webm', fps = 30, width = 1920, height = 1080 } = body

    if (!project || !project.clips || !Array.isArray(project.clips)) {
      return sendJSON(res, 400, { error: 'Proyecto inválido o sin clips' })
    }

    console.log('📦 Proyecto recibido:', {
      clips: project.clips.length,
      format,
      fps,
      resolution: `${width}x${height}`
    })

    // Procesar clips e imágenes
    const processedClips = []

    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i]
      console.log(`📸 Procesando clip ${i + 1}/${project.clips.length}`)

      // Convertir data URL a bytes
      if (clip.imageData && clip.imageData.startsWith('data:')) {
        const base64Data = clip.imageData.split(',')[1]
        const bytes = Buffer.from(base64Data, 'base64')

        const inputPath = path.join(tempDir, `input_${i}.png`)

        // Usar Sharp para procesar la imagen
        await sharp(bytes)
          .resize(width, height, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toFile(inputPath)

        processedClips.push({
          ...clip,
          inputPath,
          duration: clip.durationMs / 1000
        })
      }
    }

    // Crear lista de archivos para concat
    const concatFilePath = path.join(tempDir, 'concat.txt')
    let concatContent = ''

    for (let i = 0; i < processedClips.length; i++) {
      const clip = processedClips[i]
      concatContent += `file '${clip.inputPath}'\n`
      concatContent += `duration ${clip.duration}\n`
    }

    // Agregar el último archivo sin duration adicional
    concatContent += `file '${processedClips[processedClips.length - 1].inputPath}'\n`

    await fs.writeFile(concatFilePath, concatContent)
    console.log('📝 Archivo concat creado')

    const outputPath = path.join(tempDir, `output.${format}`)

    // Comando FFmpeg directo
    const ffmpegArgs = [
      '-y', // Sobrescribir archivos
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFilePath,
      '-c:v', format === 'webm' ? 'libvpx-vp9' : 'libx264',
      '-crf', '30',
      '-pix_fmt', 'yuv420p',
      '-r', fps.toString(),
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      outputPath
    ]

    console.log('🎬 Ejecutando FFmpeg directamente...')
    console.log('📋 Comando:', FFMPEG_PATH, ffmpegArgs.join(' '))

    // Ejecutar FFmpeg con spawn
    await new Promise<void>((resolve, reject) => {
      const process = spawn(FFMPEG_PATH, ffmpegArgs, {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stderr = ''
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg finalizado correctamente')
          resolve()
        } else {
          console.error('❌ FFmpeg falló con código:', code)
          console.error('❌ Stderr:', stderr)
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
        }
      })

      process.on('error', (err) => {
        console.error('❌ Error ejecutando FFmpeg:', err)
        reject(err)
      })
    })

    // Verificar que el archivo se creó
    const outputExists = await fs.stat(outputPath).catch(() => null)
    if (!outputExists) {
      throw new Error('Archivo de salida no encontrado')
    }

    // Leer el archivo de salida
    const outputData = await fs.readFile(outputPath)
    console.log('✅ Video renderizado, tamaño:', outputData.length, 'bytes')

    // Limpiar archivos temporales
    await fs.rm(tempDir, { recursive: true, force: true })
    console.log('🧹 Archivos temporales limpiados')

    // Configurar headers de respuesta
    setCors(res)
    res.setHeader('Content-Type', `video/${format}`)
    res.setHeader('Content-Length', outputData.length)
    res.setHeader('Content-Disposition', `inline; filename="rendered_video.${format}"`)

    // Enviar el video
    res.statusCode = 200
    res.end(outputData)

    console.log('🎉 Video enviado exitosamente')

  } catch (error: any) {
    console.error('❌ Error en renderizado:', error)

    // Limpiar archivos temporales en caso de error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }

    return sendJSON(res, 500, {
      success: false,
      error: error?.message || 'Error interno del servidor'
    })
  }
}
