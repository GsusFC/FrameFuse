const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const cors = require('cors');
const { tmpdir } = require('os');

// 🎯 FUNCIONES EXACTAS DE FFmpeg.wasm
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

// Cuantiza un valor a pasos de frame (1/fps)
function quantizeToStep(value, step, mode = 'round') {
  if (!isFinite(value) || !isFinite(step) || step <= 0) return value;
  const q = value / step;
  if (mode === 'ceil') return Math.ceil(q) * step;
  if (mode === 'floor') return Math.floor(q) * step;
  return Math.round(q) * step;
}

// 🎯 ALGORITMO HÍBRIDO: Preview + Transiciones
async function renderWithPreviewAlgorithm(processedClips, format, width, height, fps, tempDir, totalDurationSec, options = {}) {
  const { debug = false, strategy = 'segments', crf = '30', preset = 'veryfast' } = options;
  console.log('🎨 Replicando algoritmo del preview CON transiciones...');

  // Crear el path de salida
  const outputPath = path.join(tempDir, `output.${format}`);

  // Verificar si hay transiciones
  const hasTransitions = processedClips.some(clip => clip.transitionAfter && clip.transitionAfter.durationMs > 0);

  if (!hasTransitions) {
    console.log('📊 Sin transiciones, usando método concat simple');
    return await renderWithSimpleConcat(processedClips, format, width, height, fps, tempDir, totalDurationSec, outputPath, { debug, crf, preset });
  }

  const strat = (strategy || 'segments').toLowerCase();
  console.log(`📊 Con transiciones, estrategia='${strat}'`);
  if (strat === 'xfade') {
    return await renderWithPreviewXfade(processedClips, format, width, height, fps, tempDir, totalDurationSec, outputPath, { debug, crf, preset });
  }

  // Default: segmentos (robusto)
  return await renderWithSegmentPipeline(processedClips, format, width, height, fps, tempDir, outputPath, { debug, crf, preset });
}

// Método simple concat (sin transiciones)
async function renderWithSimpleConcat(processedClips, format, width, height, fps, tempDir, totalDurationSec, outputPath, options = {}) {
  const { debug = false, crf = '30', preset = 'veryfast' } = options;
  const concatFilePath = path.join(tempDir, 'concat_preview.txt');
  let concatContent = '';

  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    const durationSec = clip.durationMs / 1000;
    concatContent += `file '${clip.inputPath}'\n`;
    concatContent += `duration ${durationSec}\n`;
    console.log(`📊 Preview-style: Clip ${i} = ${durationSec}s (${clip.durationMs}ms)`);
  }

  await fs.writeFile(concatFilePath, concatContent);
  console.log(`📝 Archivo concat preview-style:\n${concatContent}`);

  let ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath,
    '-t', totalDurationSec.toString()
  ];
  
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  if (format === 'gif') {
    // Mejor GIF: palettegen/paletteuse
    const filter = `[0:v]${scaleFilter},fps=${fps},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:diff_mode=rectangle`;
    ffmpegArgs.push('-filter_complex', filter, '-loop', '0', outputPath);
  } else if (format === 'webm') {
    ffmpegArgs.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', fps.toString(), '-vf', scaleFilter, outputPath);
  } else {
    ffmpegArgs.push('-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p', '-r', fps.toString(), '-vf', scaleFilter, outputPath);
  }

  if (debug) console.log('📋 Comando concat simple:', ffmpegArgs.join(' '));
  return await executeFFmpeg(ffmpegArgs, outputPath);
}

// Método con transiciones xfade pero timing del preview
async function renderWithPreviewXfade(processedClips, format, width, height, fps, tempDir, totalDurationSec, outputPath, options = {}) {
  const { debug = false, crf = '30', preset = 'veryfast' } = options;
  console.log('🎬 Construyendo filtros xfade con timing del preview...');

  // Preparar inputs con duraciones adecuadas para xfade
  let inputs = [];
  const step = 1 / fps;
  for (let i = 0; i < processedClips.length; i++) {
    const clip = processedClips[i];
    // Duración base del clip
    const baseDur = clip.durationMs / 1000;

    // Extender el SIGUIENTE clip por la transición PREVIA para compensar el solape
    // y preservar Σ duraciones como en el preview.
    let prevTrSec = 0;
    if (i > 0) {
      const prevTr = processedClips[i - 1].transitionAfter;
      if (prevTr && prevTr.durationMs > 0 && prevTr.pluginId !== 'cut') {
        prevTrSec = Math.max(step, prevTr.durationMs / 1000);
        prevTrSec = quantizeToStep(prevTrSec, step, 'round');
      }
    }

    let inputDuration = baseDur + prevTrSec;
    // Cuantizar a frames para evitar drift
    inputDuration = quantizeToStep(Math.max(step, inputDuration), step, 'ceil');

    // Asegurar timebase uniforme por input para xfade
    inputs.push('-loop', '1', '-framerate', fps.toString(), '-t', inputDuration.toString(), '-i', clip.inputPath);
    console.log(`📊 Input ${i}: base=${baseDur}s prevTr=${prevTrSec}s → duración=${inputDuration}s @${fps}fps`);
  }

  // Construir filtros: preprocesar cada input a mismo tamaño + tiempo base
  let filterParts = [];
  const scalePad = `setsar=1,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  for (let i = 0; i < processedClips.length; i++) {
    filterParts.push(`[${i}:v]${scalePad},setpts=PTS-STARTPTS[s${i}]`);
  }

  // Ahora encadenar xfade/concat usando los streams preprocesados
  let currentStream = '[s0]';
  // Llevar un acumulado absoluto del tiempo para posicionar correctamente los offsets de xfade
  let timelineSec = 0; // suma de duraciones de clips anteriores (sin restar solapes)

  for (let i = 0; i < processedClips.length - 1; i++) {
    const currentClip = processedClips[i];
    const transition = currentClip.transitionAfter;
    const outputStream = `[v${i}]`;

    if (transition && transition.durationMs > 0) {
      // Tratar 'cut' como concatenación directa (sin xfade)
      if (transition.pluginId === 'cut') {
        filterParts.push(`${currentStream}[s${i + 1}]concat=n=2:v=1:a=0${outputStream}`);
      } else {
        // Duración real de transición (mínimo 1 frame), cuantizada a frames
        let trSec = Math.max(step, transition.durationMs / 1000);
        trSec = quantizeToStep(trSec, step, 'round');
        // Offset ABSOLUTO respecto al stream acumulado (currentStream arranca en 0)
        // Colocar el inicio de la transición al final del clip i en la línea de tiempo global
        const clipDurSec = quantizeToStep(currentClip.durationMs / 1000, step, 'round');
        let offset = Math.max(0, timelineSec + clipDurSec - trSec);
        offset = quantizeToStep(offset, step, 'round');

        const xfadeType = mapTransitionIdToXfade(transition.pluginId);
        console.log(`🎬 Transición ${i}: ${transition.pluginId} → ${xfadeType} (duración: ${trSec}s, offset abs: ${offset}s)`);

        filterParts.push(`${currentStream}[s${i + 1}]xfade=transition=${xfadeType}:duration=${trSec.toFixed(3)}:offset=${offset.toFixed(3)}${outputStream}`);
      }
    } else {
      // Sin transición, concatenar directamente
      filterParts.push(`${currentStream}[s${i + 1}]concat=n=2:v=1:a=0${outputStream}`);
    }

    currentStream = outputStream;
    // Avanzar timeline por la duración del clip i (el siguiente xfade se posiciona después de este)
    timelineSec += quantizeToStep(currentClip.durationMs / 1000, step, 'round');
  }

  // Al final, sólo ajustar fps si es GIF (ya escalamos/paddeamos por input)
  if (format === 'gif') {
    filterParts.push(`${currentStream}fps=${fps}[final]`);
  } else {
    filterParts.push(`${currentStream}[final]`);
  }

  const filterComplex = filterParts.join(';');
  if (debug) console.log('🎬 Filtros xfade construidos:', filterComplex);

  // Comando FFmpeg con xfade - DEJAR QUE XFADE DETERMINE LA DURACIÓN
  let ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[final]'
    // 🎯 CRÍTICO: NO usar -t, dejar que xfade determine la duración natural
  ];

  if (format === 'gif') {
    // Aplicar palette en salida de [final] implicaría construir filtro complejo distinto; mantener salida directa y transcodificar a GIF no trivial aquí
    ffmpegArgs.push('-loop', '0', outputPath);
  } else if (format === 'webm') {
    ffmpegArgs.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', fps.toString(), outputPath);
  } else {
    ffmpegArgs.push('-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p', '-r', fps.toString(), outputPath);
  }

  if (debug) console.log('📋 Comando xfade con timing preview:', ffmpegArgs.join(' '));
  return await executeFFmpeg(ffmpegArgs, outputPath);
}

// Pipeline robusto por segmentos: acumula timeline evitando offsets globales
async function renderWithSegmentPipeline(processedClips, format, width, height, fps, tempDir, finalOutputPath, options = {}) {
  const { debug = false, crf = '30', preset = 'veryfast' } = options;
  const step = 1 / fps;
  const q = (v) => quantizeToStep(Math.max(step, v), step, 'round');

  const mkClipVideo = async (imgPath, durSec, outPath) => {
    // Genera un video desde una imagen con escala/pad consistente
    const scalePad = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
    const args = [
      '-y',
      '-loop', '1', '-framerate', fps.toString(),
      '-t', durSec.toString(), '-i', imgPath,
      '-vf', scalePad,
      '-r', fps.toString(),
      '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p',
      outPath
    ];
    if (debug) console.log('📋 mkClipVideo:', args.join(' '));
    await executeFFmpeg(args, outPath);
    return outPath;
  };

  // Generar video inicial para el primer clip
  const d0 = q(processedClips[0].durationMs / 1000);
  let accDur = d0;
  let sPrev = path.join(tempDir, `seg_acc_0.mp4`);
  await mkClipVideo(processedClips[0].inputPath, d0, sPrev);

  // Pre-generar videos de cada clip para reuso
  const preVideos = [];
  for (let i = 0; i < processedClips.length; i++) {
    const d = q(processedClips[i].durationMs / 1000);
    const out = path.join(tempDir, `clip_${i}.mp4`);
    await mkClipVideo(processedClips[i].inputPath, d, out);
    preVideos.push({ path: out, dur: d });
  }

  // Iterar transiciones i = 0 .. N-2 (entre clip i y i+1)
  for (let i = 0; i < processedClips.length - 1; i++) {
    const nextClip = processedClips[i + 1];
    const nextVid = preVideos[i + 1];
    const currDur = q(processedClips[i].durationMs / 1000);
    const nextDur = q(nextClip.durationMs / 1000);
    let trSec = 0;
    let xType = 'fade';
    const tr = processedClips[i].transitionAfter;
    if (tr && tr.durationMs > 0 && tr.pluginId !== 'cut') {
      trSec = q(tr.durationMs / 1000);
      // No exceder límites de clips
      trSec = Math.min(trSec, currDur - step, nextDur - step);
      xType = mapTransitionIdToXfade(tr.pluginId);
    }

    const outPath = path.join(tempDir, `seg_acc_${i + 1}.mp4`);

    if (trSec <= 0) {
      // Corte duro: concatenar S_prev + nextVid
      const filter = `[0:v][1:v]concat=n=2:v=1:a=0[out]`;
      const args = [
        '-y', '-i', sPrev, '-i', nextVid.path,
        '-filter_complex', filter,
        '-map', '[out]',
        '-r', fps.toString(),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        outPath
      ];
      await executeFFmpeg(args, outPath);
      accDur += nextDur;
      sPrev = outPath;
      continue;
    }

    // Construir filtros locales al par: S_prev (dur accDur) y nextVid (dur nextDur)
    const sMainEnd = q(Math.max(0, accDur - trSec));
    const sTailStart = sMainEnd;
    const bHeadEnd = trSec;
    const bRestStart = trSec;

    const filterParts = [
      // Normalizar PTS de S_prev y next
      `[0:v]setpts=PTS-STARTPTS[s]`,
      `[1:v]setpts=PTS-STARTPTS[b]`,
      // Split para usar dos ramas de cada uno
      `[s]split=2[s0][s1]`,
      `[b]split=2[b0][b1]`,
      // Dividir S_prev en s_main y s_tail
      `[s0]trim=0:${sMainEnd},setpts=PTS-STARTPTS[s_main]`,
      `[s1]trim=${sTailStart}:${accDur},setpts=PTS-STARTPTS[s_tail]`,
      // B: cabeza para xfade y B completo después (duplicando la cabeza como en el preview)
      `[b0]trim=0:${bHeadEnd},setpts=PTS-STARTPTS[b_head]`,
      `[b1]setpts=PTS-STARTPTS[b_full]`,
      // Xfade local con offset 0
      `[s_tail][b_head]xfade=transition=${xType}:duration=${trSec.toFixed(3)}:offset=0[x]`,
      // Ensamblar
      `[s_main][x][b_full]concat=n=3:v=1:a=0[out]`
    ];

    const args = [
      '-y', '-i', sPrev, '-i', nextVid.path,
      '-filter_complex', filterParts.join(';'),
      '-map', '[out]',
      '-r', fps.toString(),
      '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p',
      outPath
    ];

    if (debug) {
      console.log(`🎯 Segmento ${i} → ${i + 1}: tr=${trSec}s tipo=${xType}, accDur=${accDur}s, nextDur=${nextDur}s`);
      console.log('📋 FFmpeg seg args:', args.join(' '));
      console.log('🎬 Seg filter:', filterParts.join(';'));
    }
    await executeFFmpeg(args, outPath);
    accDur += nextDur; // La duración acumulada suma el clip siguiente completo
    sPrev = outPath;
  }

  // Convertir a formato final si no es mp4
  if (format === 'mp4') {
    if (sPrev !== finalOutputPath) {
      // Remux/reencode ligero para aplicar preset/crf uniformes si se desea
      const args = [
        '-y', '-i', sPrev,
        '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-pix_fmt', 'yuv420p', '-r', fps.toString(),
        finalOutputPath
      ];
      if (debug) console.log('📋 Finalize MP4:', args.join(' '));
      await executeFFmpeg(args, finalOutputPath);
    }
    return finalOutputPath;
  }

  if (format === 'webm') {
    const args = [
      '-y', '-i', sPrev,
      '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30',
      '-pix_fmt', 'yuv420p', '-r', fps.toString(),
      finalOutputPath
    ];
    if (debug) console.log('📋 Finalize WEBM:', args.join(' '));
    await executeFFmpeg(args, finalOutputPath);
    return finalOutputPath;
  }

  if (format === 'gif') {
    // Palettegen/paletteuse para mejor calidad
    const fc = `[0:v]fps=${fps},scale=${width}:${height}:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:diff_mode=rectangle`;
    const args = [
      '-y', '-i', sPrev,
      '-filter_complex', fc,
      '-loop', '0',
      finalOutputPath
    ];
    if (debug) {
      console.log('📋 Finalize GIF:', args.join(' '));
      console.log('🎬 GIF filter:', fc);
    }
    await executeFFmpeg(args, finalOutputPath);
    return finalOutputPath;
  }

  // Fallback
  await fs.copyFile(sPrev, finalOutputPath);
  return finalOutputPath;
}

// Función helper para ejecutar FFmpeg
async function executeFFmpeg(ffmpegArgs, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Renderizado completado exitosamente');
        resolve(outputPath);
      } else {
        console.error('❌ Error en renderizado:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// Resolver binario de FFmpeg
let FFMPEG_CMD = process.env.FFMPEG_PATH || 'ffmpeg';
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    FFMPEG_CMD = ffmpegInstaller.path;
  }
} catch {
  // keep default
}

const ffmpegPath = FFMPEG_CMD;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FrameFuse API is running' });
});

// Configurar multer para archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por archivo
    files: 20 // máximo 20 archivos
  }
});

// Endpoint principal de renderizado (sin multer, recibe data URLs)
app.post('/api/render', async (req, res) => {
  let tempDir;
  
  try {
    console.log('🚀 Iniciando renderizado...');
    
    // Parsear configuración con la estructura real del frontend
    console.log('📋 req.body:', req.body);

    // El frontend envía los datos directamente en req.body, no como JSON string
    const { project, format = 'mp4', width = 1280, height = 720, fps = 30 } = req.body;
    const debug = Boolean((req.query && (req.query.debug === '1' || req.query.debug === 'true')) || req.body?.debug);
    const strategy = String(req.body?.strategy || process.env.FFZ_EXPORT_STRATEGY || 'segments').toLowerCase();
    const crf = String(req.body?.crf || process.env.FFZ_CRF || '30');
    const preset = String(req.body?.preset || process.env.FFZ_PRESET || 'veryfast');

    if (!project || !project.clips) {
      throw new Error('Campo project.clips no encontrado en la petición');
    }

    const clips = project.clips;
    
    console.log(`📊 Configuración: ${clips.length} clips, ${format}, ${width}x${height}, ${fps}fps, estrategia=${strategy}, crf=${crf}, preset=${preset}, debug=${debug}`);
    
    // Crear directorio temporal
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'framefuse-'));
    console.log('📁 Directorio temporal:', tempDir);
    
    // Procesar clips desde data URLs base64
    const processedClips = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      console.log(`📋 Procesando clip ${i}: durationMs=${clip.durationMs}`);

      // El frontend envía las imágenes como data URLs base64, no como archivos
      if (!clip.imageData) {
        throw new Error(`Imagen ${i} no encontrada en clip.imageData`);
      }

      // Convertir data URL base64 a buffer
      const base64Data = clip.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      console.log(`📋 Imagen ${i}: ${imageBuffer.length} bytes desde base64`);

      // Procesar imagen con Sharp
      const inputPath = path.join(tempDir, `input_${i}.png`);
      await sharp(imageBuffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toFile(inputPath);
      
      processedClips.push({
        inputPath,
        durationMs: clip.durationMs,
        duration: clip.durationMs / 1000,
        transitionAfter: clip.transitionAfter
      });
      
      console.log(`✅ Clip ${i} procesado: ${clip.durationMs}ms`);
    }
    
    // 🎯 CALCULAR DURACIÓN CORRECTA PARA XFADE
    console.log('✅ Calculando duración correcta para xfade...');

    // Para xfade, la duración total es diferente que para superposiciones
    // xfade funciona secuencialmente: clip1 + transición + clip2 + transición + clip3...

    // Verificar si hay transiciones
    const hasTransitions = processedClips.some(clip => clip.transitionAfter && clip.transitionAfter.durationMs > 0);

    let totalDurationMs = 0;

    if (hasTransitions) {
      // Con transiciones: calcular duración secuencial para xfade
      for (let i = 0; i < processedClips.length; i++) {
        totalDurationMs += processedClips[i].durationMs;
        console.log(`📊 Sumando clip ${i}: ${processedClips[i].durationMs}ms`);
      }
      console.log(`📊 Duración total para xfade (SIN restar transiciones): ${totalDurationMs / 1000}s`);
    } else {
      // Sin transiciones: suma simple
      totalDurationMs = processedClips.reduce((sum, c) => sum + c.durationMs, 0);
      console.log(`📊 Duración total sin transiciones: ${totalDurationMs / 1000}s`);
    }

    const totalDurationSec = totalDurationMs / 1000;

    console.log(`📊 Clips individuales:`, processedClips.map((c, i) => `Clip ${i}: ${c.durationMs}ms`));
    console.log(`📊 Transiciones:`, processedClips.map((c, i) => c.transitionAfter ? `T${i}: ${c.transitionAfter.durationMs}ms` : `T${i}: ninguna`).filter(t => !t.includes('ninguna')));
    
    // Usar método que replica exactamente el preview
    const generatedOutputPath = await renderWithPreviewAlgorithm(processedClips, format, width, height, fps, tempDir, totalDurationSec, { debug, strategy, crf, preset });
    
    // Leer el archivo de salida y enviarlo
    const outputData = await fs.readFile(generatedOutputPath);
    console.log('✅ Video renderizado replicando preview, tamaño:', outputData.length, 'bytes');
    
    // Limpiar archivos temporales
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('🧹 Archivos temporales limpiados');

    // Configurar headers de respuesta
    res.setHeader('Content-Type', `video/${format}`);
    res.setHeader('Content-Length', outputData.length);
    res.setHeader('Content-Disposition', `inline; filename="rendered_video.${format}"`);

    // Enviar el video
    res.status(200).send(outputData);
    console.log('🎉 Video enviado exitosamente replicando preview');

  } catch (error) {
    console.error('❌ Error en renderizado:', error);

    // Limpiar archivos temporales en caso de error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 FrameFuse API corriendo en puerto ${PORT}`);
  console.log(`🔧 FFmpeg: ${FFMPEG_CMD}`);
});
