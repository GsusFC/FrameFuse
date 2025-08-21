// Servidor Express para FrameFuse API en GitLab
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FrameFuse API GitLab está funcionando',
    timestamp: new Date().toISOString(),
    ffmpeg: 'available'
  });
});

// Ruta principal de renderizado
app.post('/render', async (req, res) => {
  let tempDir = '';

  try {
    console.log('🎬 Iniciando renderizado de video en GitLab...');

    // Crear directorio temporal
    tempDir = path.join(tmpdir(), `framefuse-render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });
    console.log('📁 Directorio temporal creado:', tempDir);

    const { project, format = 'webm', fps = 30, width = 1920, height = 1080 } = req.body;

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

        // Usar Sharp para procesar la imagen
        await sharp(bytes)
          .resize(width, height, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toFile(inputPath);

        processedClips.push({
          ...clip,
          inputPath,
          duration: clip.durationMs / 1000
        });
      }
    }

    // Crear lista de archivos para concat
    const concatFilePath = path.join(tempDir, 'concat.txt');
    let concatContent = '';

    for (let i = 0; i < processedClips.length; i++) {
      const clip = processedClips[i];
      concatContent += `file '${clip.inputPath}'\\n`;
      concatContent += `duration ${clip.duration}\\n`;
    }

    // Agregar el último archivo sin duration adicional
    concatContent += `file '${processedClips[processedClips.length - 1].inputPath}'\\n`;

    await fs.writeFile(concatFilePath, concatContent);
    console.log('📝 Archivo concat creado');

    const outputPath = path.join(tempDir, `output.${format}`);

    // Comando FFmpeg usando la instalación del sistema
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
    ];

    console.log('🎬 Ejecutando FFmpeg nativo en GitLab...');
    console.log('📋 Comando: ffmpeg', ffmpegArgs.join(' '));

    // Ejecutar FFmpeg con spawn
    await new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', ffmpegArgs, {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg finalizado correctamente');
          resolve();
        } else {
          console.error('❌ FFmpeg falló con código:', code);
          console.error('❌ Stderr:', stderr);
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        console.error('❌ Error ejecutando FFmpeg:', err);
        reject(err);
      });
    });

    // Verificar que el archivo se creó
    const outputExists = await fs.stat(outputPath).catch(() => null);
    if (!outputExists) {
      throw new Error('Archivo de salida no encontrado');
    }

    // Leer el archivo de salida
    const outputData = await fs.readFile(outputPath);
    console.log('✅ Video renderizado, tamaño:', outputData.length, 'bytes');

    // Limpiar archivos temporales
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('🧹 Archivos temporales limpiados');

    // Configurar headers de respuesta
    res.setHeader('Content-Type', `video/${format}`);
    res.setHeader('Content-Length', outputData.length);
    res.setHeader('Content-Disposition', `inline; filename="rendered_video.${format}"`);

    // Enviar el video
    res.status(200).send(outputData);

    console.log('🎉 Video enviado exitosamente desde GitLab');

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
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FrameFuse API corriendo en puerto ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Render endpoint: http://localhost:${PORT}/render`);
});

module.exports = app;
