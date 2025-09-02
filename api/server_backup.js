// Servidor Express para FrameFuse API en GitLab
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
// const sharp = require('sharp'); // Temporalmente deshabilitado por problemas de instalación
const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');

// 🎯 SINCRONIZACIÓN: Funciones EXACTAS de FFmpeg.wasm
function mapTransitionIdToXfade(id) {
  switch (id) {
    case 'crossfade':
    case 'fade':
      return 'fade';
    case 'fadeblack':
      return 'fadeblack';
    case 'fadewhite':
      return 'fadewhite';
    case 'slide-right':
      return 'slideright';
    case 'slide-left':
      return 'slideleft';
    case 'slide-up':
      return 'slideup';
    case 'slide-down':
      return 'slidedown';
    case 'wipe-right':
      return 'wiperight';
    case 'wipe-left':
      return 'wipeleft';
    case 'wipe-up':
      return 'wipeup';
    case 'wipe-down':
      return 'wipedown';
    case 'dissolve':
      return 'dissolve';
    case 'pixelate':
      return 'pixelize';
    case 'cut':
    default:
      return 'fade';
  }
}

function toSec(ms) {
  return Math.max(0.033, Math.round(ms) / 1000);
}

// 🎯 ALGORITMO QUE REPLICA EXACTAMENTE EL PREVIEW
async function renderWithPreviewAlgorithm(processedClips, format, width, height, fps, tempDir, totalDurationSec) {
  console.log('🎨 Replicando algoritmo exacto del preview Canvas 2D...');

  // Crear el path de salida
  const outputPath = path.join(tempDir, `output.${format}`);

  // Crear archivo concat que replica exactamente el comportamiento del preview
  const concatFilePath = path.join(tempDir, 'concat_preview.txt');
  let concatContent = '';

  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    const durationSec = clip.durationMs / 1000; // Convertir ms a segundos como en preview
    concatContent += `file '${clip.inputPath}'\n`;
    concatContent += `duration ${durationSec}\n`;
    console.log(`📊 Preview-style: Clip ${i} = ${durationSec}s (${clip.durationMs}ms)`);
  }

  await fs.writeFile(concatFilePath, concatContent);
  console.log(`📝 Archivo concat preview-style:\n${concatContent}`);

  // Comando FFmpeg que replica el preview: duración total exacta
  let ffmpegArgs = [
    '-y', // Sobrescribir archivos
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath,
    '-t', totalDurationSec.toString() // Duración total EXACTA como preview
  ];

  // Configuración específica por formato
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  if (format === 'gif') {
    ffmpegArgs.push(
      '-vf', `${scaleFilter},fps=${fps}`,
      '-loop', '0',
      outputPath
    );
  } else {
    ffmpegArgs.push(
      '-c:v', format === 'webm' ? 'libvpx-vp9' : 'libx264',
      '-crf', '30',
      '-pix_fmt', 'yuv420p',
      '-r', fps.toString(),
      '-vf', scaleFilter,
      outputPath
    );
  }

  console.log('📋 Comando preview-replica:', ffmpegArgs.join(' '));

  // Ejecutar FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Renderizado preview-replica completado exitosamente');
        resolve(outputPath); // Devolver el path del archivo generado
      } else {
        console.error('❌ Error en renderizado preview-replica:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// 🎯 MÉTODO ALTERNATIVO ORIGINAL: Concat + Overlays para duraciones exactas
async function renderWithConcatMethod(processedClips, format, width, height, fps, tempDir) {
  console.log('🔄 Iniciando renderizado con método concat + overlays...');

  // Crear el path de salida
  const outputPath = path.join(tempDir, `output.${format}`);

  // Crear archivo concat con duraciones exactas
  const concatFilePath = path.join(tempDir, 'concat.txt');
  let concatContent = '';
  let totalDuration = 0;

  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    concatContent += `file '${clip.inputPath}'\n`;
    concatContent += `duration ${clip.duration}\n`;
    totalDuration += clip.duration;
  }
  // 🎯 CORRECCIÓN: NO agregar línea final sin duration (causa extensión indefinida)

  await fs.writeFile(concatFilePath, concatContent);
  console.log(`📊 Video base creado con duración total: ${totalDuration}s`);
  console.log(`📝 Contenido del archivo concat:\n${concatContent}`);

  // Construir comando FFmpeg con concat y duración exacta
  let ffmpegArgs = [
    '-y', // Sobrescribir archivos
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath,
    '-t', totalDuration.toString() // 🎯 CRÍTICO: Especificar duración exacta
  ];

  // Configuración específica por formato
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  if (format === 'gif') {
    ffmpegArgs.push(
      '-vf', `${scaleFilter},fps=${fps}`,
      '-loop', '0',
      outputPath
    );
  } else {
    ffmpegArgs.push(
      '-c:v', format === 'webm' ? 'libvpx-vp9' : 'libx264',
      '-crf', '30',
      '-pix_fmt', 'yuv420p',
      '-r', fps.toString(),
      '-vf', scaleFilter,
      outputPath
    );
  }

  console.log('📋 Comando concat:', ffmpegArgs.join(' '));

  // Ejecutar FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Renderizado concat completado exitosamente');
        resolve(outputPath); // Devolver el path del archivo generado
      } else {
        console.error('❌ Error en renderizado concat:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Resolver binario de FFmpeg: usar variable de entorno, si no, fallback a @ffmpeg-installer/ffmpeg o 'ffmpeg'
let FFMPEG_CMD = process.env.FFMPEG_PATH || 'ffmpeg';
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    FFMPEG_CMD = ffmpegInstaller.path;
  }
} catch {
  // keep default
}

// Variable global para usar en funciones
const ffmpegPath = FFMPEG_CMD;

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ruta de health check
function healthHandler(req, res) {
  res.json({ 
    status: 'ok', 
    message: 'FrameFuse API GitLab está funcionando',
    timestamp: new Date().toISOString(),
    ffmpeg: FFMPEG_CMD
  });
}
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Ruta principal de renderizado
async function renderHandler(req, res) {
  let tempDir = '';

  try {
    console.log('🎬 Iniciando renderizado de video en GitLab...');

    // Crear directorio temporal
    tempDir = path.join(tmpdir(), `framefuse-render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });
    console.log('📁 Directorio temporal creado:', tempDir);

    const { project, format = 'webm', fps = 30, width = 1920, height = 1080 } = req.body;
   const allowed = new Set(['mp4', 'webm', 'gif']);
   if (!allowed.has(String(format).toLowerCase())) {
     return res.status(400).json({ error: `Formato no soportado: ${format}` });
   }
   if (!Number.isFinite(fps) || fps < 1 || fps > 60) {
     return res.status(400).json({ error: `FPS inválido: ${fps}` });
   }
   if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
     return res.status(400).json({ error: `Resolución inválida: ${width}x${height}` });
   }

    if (!project || !project.clips || !Array.isArray(project.clips)) {
      return res.status(400).json({ error: 'Proyecto inválido o sin clips' });
    }

    console.log('📦 Proyecto recibido:', {
      clips: project.clips.length,
      format,
      fps,
      resolution: `${width}x${height}`
    });

    // Procesar clips e imágenes
    const processedClips = [];

    for (let i = 0; i < project.clips.length; i++) {
      const clip = project.clips[i];
      console.log(`📸 Procesando clip ${i + 1}/${project.clips.length}`);

      // Convertir data URL a bytes
      if (clip.imageData && clip.imageData.startsWith('data:')) {
        const base64Data = clip.imageData.split(',')[1];
        const bytes = Buffer.from(base64Data, 'base64');

        const inputPath = path.join(tempDir, `input_${i}.png`);

        // Temporalmente sin Sharp - guardar imagen original
        // TODO: Rehabilitar Sharp cuando se resuelva el problema de instalación
        await fs.writeFile(inputPath, bytes);

        processedClips.push({
          ...clip,
          inputPath,
          duration: clip.durationMs / 1000
        });
      }
    }

    // 🎬 NUEVO: Verificar si hay transiciones para procesar
    console.log('🎬 Analizando transiciones...');
    if (processedClips.length === 0) {
      return res.status(400).json({ error: 'No se encontraron clips válidos (imageData faltante o inválido).' });
    }

    const hasTransitions = processedClips.some(clip => clip.transitionAfter && clip.transitionAfter.durationMs > 0);

    // 🎯 REPLICAR EXACTAMENTE EL ALGORITMO DEL PREVIEW
    console.log('✅ Replicando algoritmo exacto del preview Canvas 2D...');
    // Calcular duración total EXACTAMENTE como el preview (línea 52 de PreviewPanel.tsx)
    const totalDurationMs = processedClips.reduce((sum, c) => sum + c.durationMs, 0) || 1;
    const totalDurationSec = totalDurationMs / 1000;

    console.log(`📊 Duración total calculada como preview: ${totalDurationSec}s (${totalDurationMs}ms)`);
    console.log(`📊 Clips individuales:`, processedClips.map((c, i) => `Clip ${i}: ${c.durationMs}ms`));

    // Usar método simple que replica exactamente el preview
    const generatedOutputPath = await renderWithPreviewAlgorithm(processedClips, format, width, height, fps, tempDir, totalDurationSec);

    // Leer el archivo de salida y enviarlo
    const outputData = await fs.readFile(generatedOutputPath);
    console.log('✅ Video renderizado replicando preview, tamaño:', outputData.length, 'bytes');

    // Limpiar archivos temporales
    await fs.rm(tempDir, { recursive: true, force: true });
    // Configurar headers de respuesta
    const contentType = format === 'gif' ? 'image/gif' : `video/${format}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', outputData.length);
    res.setHeader('Content-Disposition', `inline; filename="rendered_video.${format}"`);
    res.setHeader('Content-Length', outputData.length);
    res.setHeader('Content-Disposition', `inline; filename="rendered_video.${format}"`);

    // Enviar el video
    res.status(200).send(outputData);
    console.log('🎉 Video enviado exitosamente replicando preview');
    return;

    // (removed) Unreachable hybrid block with undefined identifiers.

  } catch (error) {
    console.error('❌ Error en renderizado:', error);

    // Limpiar archivos temporales en caso de error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error?.message || 'Error interno del servidor'
    });
  }
}
app.post('/render', renderHandler);
// Alias con prefijo /api para compatibilidad con frontend
app.post('/api/render', renderHandler);

// Endpoint de sesión (placeholder local) para evitar 404s en desarrollo
app.get(['/session/:id', '/api/session/:id'], async (req, res) => {
  const { id } = req.params || {};
  return res.status(404).json({
    success: false,
    sessionId: id,
    error: 'Session lookup is not implemented in local Express server. Use Vercel deployment for /api/session or remove sessionId from URL.'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FrameFuse API corriendo en puerto ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Render endpoint: http://localhost:${PORT}/render`);
});

module.exports = app;
