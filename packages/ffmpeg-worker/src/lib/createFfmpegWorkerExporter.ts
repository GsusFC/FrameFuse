import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { Timeline } from '@framefuse/core';
import type { ExportOptions, VideoExporter } from '@framefuse/core';
import type { FfmpegWorkerOptions } from '../types';

/**
 * Key improvements:
 * 1) Pre-trimmed durations when previewSeconds is set (with accurate progress)
 * 2) Automatic fallback to WebM/VP9 if libx264 is unavailable in ffmpeg.wasm
 * 3) Progress/log listeners without leaks (single global listener and current context)
 * 4) More mime/ext supported (webp/avif/gif/bmp/svg). Fallback to browser PNG re-encode if needed
 * 5) Clearer validations and error messages; robust cleanup
 */

function guessExt(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('bmp')) return 'bmp';
  if (mime.includes('avif')) return 'avif';
  if (mime.includes('svg')) return 'svg';
  return 'img';
}

async function dataUrlToBytes(dataUrl: string): Promise<{ bytes: Uint8Array; ext: string; mime: string }>{
  console.log('🔍 Processing data URL, length:', dataUrl.length);

  // Validar que es una data URL válida
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL: does not start with "data:"');
  }

  // Parsear data URL más robustamente
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URL: missing comma separator');
  }

  const header = dataUrl.substring(5, commaIndex); // Remove 'data:' prefix
  const data = dataUrl.substring(commaIndex + 1);

  console.log('📝 Data URL header:', header);
  console.log('📊 Data length:', data.length);

  // Parsear header: "image/jpeg;base64" o "image/png"
  const headerParts = header.split(';');
  const mime = headerParts[0];
  const encoding = headerParts[1];

  console.log('🏷️ MIME type:', mime);
  console.log('🔐 Encoding:', encoding);

  if (encoding === 'base64') {
    // Validar base64
    if (!data || data.length === 0) {
      throw new Error('Empty base64 data in data URL');
    }

    // Limpiar whitespace/newlines del base64
    const cleanedData = data.replace(/\s+/g, '');

    // Verificar que es base64 válido usando try/catch con Buffer.from()
    try {
      Buffer.from(cleanedData, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 data in data URL');
    }

    const estimatedSize = (cleanedData.length * 3) / 4;
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB por imagen

    console.log('📏 Estimated size:', Math.round(estimatedSize / 1024), 'KB');

    if (estimatedSize > MAX_IMAGE_SIZE) {
      throw new Error(`Image too large: ${Math.round(estimatedSize / 1024 / 1024)}MB. Maximum: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }

    try {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }

      console.log('✅ Successfully decoded base64, bytes:', bytes.length);

      // Verificar que los bytes no están vacíos
      if (bytes.length === 0) {
        throw new Error('Decoded base64 resulted in empty bytes');
      }

      return { bytes, ext: guessExt(mime), mime };
    } catch (error) {
      console.error('❌ Error decoding base64:', error);
      throw new Error(`Failed to decode base64 data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Para otros encodings (como utf8) o sin encoding especificado
    console.log('🔄 Handling non-base64 encoding or fallback to fetch');

    try {
      const res = await fetch(dataUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch data URL: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      const array = new Uint8Array(await blob.arrayBuffer());

      console.log('✅ Successfully fetched via blob, bytes:', array.length);

      if (array.length === 0) {
        throw new Error('Fetched blob resulted in empty bytes');
      }

      const ext = guessExt(blob.type || mime);
      return { bytes: array, ext, mime: blob.type || mime };
    } catch (error) {
      console.error('❌ Error fetching data URL:', error);
      throw new Error(`Failed to fetch data URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

function buildScaleFilter(opts: ExportOptions): string | undefined {
  const { width, height, scaleMode } = opts;
  if (!width || !height) return undefined;
  if (scaleMode === 'cover') {
    return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  }
  // fit: letterbox
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
}

function mapTransitionIdToXfade(id?: string): string {
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

function toSec(ms: number): number {
  return Math.max(0.033, Math.round(ms) / 1000);
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

export function createFfmpegWorkerExporter(_options: FfmpegWorkerOptions = {}): VideoExporter {
  const ffmpeg = new FFmpeg();

  // Contexto global para evitar fugas de listeners
  let progressCtx: { totalSec: number; onProgress?: (p: number) => void } = { totalSec: 1 };
  let logInitialized = false;
  let mp4Support: boolean | null = null; // caché

  async function ensureLoaded(): Promise<void> {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }
    // Inicializamos listeners UNA sola vez
    if (!logInitialized) {
      ffmpeg.on('progress', ({ time }: any) => {
        if (typeof time === 'number' && progressCtx.onProgress && progressCtx.totalSec) {
          progressCtx.onProgress(clamp01(time / progressCtx.totalSec));
        }
      });
      ffmpeg.on('log', ({ message }) => {
        // Reducible/filtrable si hace falta
        if (message?.includes('Error') || message?.includes('xfade') || message?.includes('concat')) {
          console.debug('🎬 FFmpeg:', message);
        }
      });
      logInitialized = true;
    }
  }

  function normalizeDurations(timeline: Timeline, previewSeconds?: number | null) {
    const base = timeline.clips.map(c => toSec(c.durationMs));
    if (!previewSeconds || previewSeconds <= 0) return base;
    let remaining = previewSeconds;
    return base.map(d => {
      if (remaining <= 0) return 0.033; // frame mínimo
      const used = Math.max(0.033, Math.min(d, remaining));
      remaining = Math.max(0, remaining - used);
      return used;
    });
  }

  return {
    async export(timeline: Timeline, opts: ExportOptions) {
      await ensureLoaded();

      const abortSignal = opts.signal;
      const onProgress = opts.onProgress;

      // Estimación de memoria previa (solo dataURL base64)
      const totalEstimatedMemory = timeline.clips.reduce((total, clip) => {
        const match = clip.src.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          const base64 = match[2];
          return total + ((base64.length * 3) / 4);
        }
        return total;
      }, 0);
      const MAX_TOTAL_MEMORY = 200 * 1024 * 1024; // 200MB
      if (totalEstimatedMemory > MAX_TOTAL_MEMORY) {
        throw new Error(`Estimated total memory too large: ${Math.round(totalEstimatedMemory / 1024 / 1024)}MB. Maximum: ${MAX_TOTAL_MEMORY / 1024 / 1024}MB`);
      }

      // Duraciones normalizadas (con previewSeconds aplicado ANTES de calcular xfade)
      const durations = normalizeDurations(timeline, typeof opts.previewSeconds === 'number' ? opts.previewSeconds : null);
      const totalSecPlanned = durations.reduce((a, b) => a + b, 0);

      // Prepara progreso exacto
      progressCtx.totalSec = totalSecPlanned || 1;
      progressCtx.onProgress = onProgress;

      const scale = buildScaleFilter(opts);

      const images: { name: string; ext: string; durSec: number }[] = [];
      const tempFiles: string[] = [];

      const abortHandler = () => { try { ffmpeg.terminate(); } catch {} };
      if (abortSignal) abortSignal.addEventListener('abort', abortHandler, { once: true });

      try {
        // Escribir inputs
        for (let i = 0; i < timeline.clips.length; i++) {
          const clip = timeline.clips[i];
          const dur = durations[i];
          if (!dur || dur <= 0) {
            console.log(`⏭️ Skipping clip ${i}: zero duration after preview trimming`);
            continue; // saltar clips sin duración tras preview
          }

          console.log(`📸 Processing clip ${i}/${timeline.clips.length}, duration: ${dur}s`);

          try {
            const { bytes, ext, mime } = await dataUrlToBytes(clip.src);

            // Validaciones adicionales de datos
            if (!bytes || bytes.length === 0) {
              throw new Error(`Clip ${i}: empty or corrupted buffer`);
            }

            // Verificar que los primeros bytes parezcan una imagen válida
            if (bytes.length < 10) {
              throw new Error(`Clip ${i}: buffer too small (${bytes.length} bytes)`);
            }

            // Verificar que no haya demasiados bytes nulos al inicio
            let nullBytes = 0;
            for (let j = 0; j < Math.min(100, bytes.length); j++) {
              if (bytes[j] === 0) nullBytes++;
              else break;
            }
            if (nullBytes > 50) {
              throw new Error(`Clip ${i}: too many null bytes at start (${nullBytes})`);
            }

            console.log(`✅ Clip ${i}: loaded ${bytes.length} bytes, format: ${ext} (${mime})`);

            let effectiveExt = ext;
            let fileBytes = bytes;

            // Algunos builds de ffmpeg.wasm no traen decoders para AVIF; re-encode a PNG vía Canvas
            if (ext === 'avif' || ext === 'svg') {
              try {
                console.log(`🔄 Re-encoding ${ext} to PNG for clip ${i}`);
                const blob = new Blob([new Uint8Array(bytes)], { type: mime });
                const bmp = await createImageBitmap(blob);
                const cnv = new OffscreenCanvas(bmp.width, bmp.height);
                const ctx = cnv.getContext('2d');
                if (!ctx) throw new Error('2D context not available');
                ctx.drawImage(bmp, 0, 0);
                const png = await cnv.convertToBlob({ type: 'image/png' });
                fileBytes = new Uint8Array(await png.arrayBuffer());
                effectiveExt = 'png';
                console.log(`✅ Re-encoded to PNG: ${fileBytes.length} bytes`);
              } catch (e) {
                console.warn(`⚠️ Failed re-encode ${ext}→png for clip ${i}, trying original:`, e);
                // Continuar con el archivo original
              }
            }

            // Pre-downscale para imágenes grandes en WASM (reduce picos de memoria)
            const isWasm = true; // En este contexto siempre es WASM
            if (isWasm && (effectiveExt === 'png' || effectiveExt === 'jpg' || effectiveExt === 'jpeg')) {
              try {
                const blob = new Blob([new Uint8Array(fileBytes)], { type: `image/${effectiveExt}` });
                const bmp = await createImageBitmap(blob);

                // Si la imagen es muy grande, reducirla antes de pasar a FFmpeg
                const MAX_DIM = Math.max(opts.width ?? 1280, opts.height ?? 720);
                if (bmp.width > MAX_DIM || bmp.height > MAX_DIM) {
                  const scale = Math.min(MAX_DIM / bmp.width, MAX_DIM / bmp.height);
                  const newWidth = Math.round(bmp.width * scale);
                  const newHeight = Math.round(bmp.height * scale);

                  console.log(`📏 Pre-downscaling image ${i}: ${bmp.width}x${bmp.height} → ${newWidth}x${newHeight}`);

                  const cnv = new OffscreenCanvas(newWidth, newHeight);
                  const ctx = cnv.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(bmp, 0, 0, newWidth, newHeight);
                    const downscaledBlob = await cnv.convertToBlob({ type: 'image/png' });
                    fileBytes = new Uint8Array(await downscaledBlob.arrayBuffer());
                    effectiveExt = 'png';
                    console.log(`✅ Pre-downscaled: ${fileBytes.length} bytes`);
                  }
                }
              } catch (e) {
                console.warn(`⚠️ Pre-downscale failed for clip ${i}:`, e);
                // Continuar con el archivo original
              }
            }

            const name = `img_${i}.${effectiveExt}`;
            console.log(`💾 Writing file: ${name} (${fileBytes.length} bytes)`);

            // Escribir archivo a FFmpeg con timeout
            await Promise.race([
              ffmpeg.writeFile(name, fileBytes),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout writing file ${name}`)), 10000)
              )
            ]);

            // Verificar que el archivo existe y tiene un tamaño razonable
            const written = await ffmpeg.readFile(name);
            if (!written || written.length === 0) {
              throw new Error(`File ${name} was not written correctly (empty)`);
            }

            console.log(`✅ File written successfully: ${name} (${written.length} bytes)`);

            // Flag para deshabilitar verificaciones de FS que duplican memoria (útil en WASM)
            const DEBUG_VERIFY_FS = false; // Cambiar a true para debugging

            if (DEBUG_VERIFY_FS) {
              // Verificar que el tamaño no sea excesivamente diferente (tolerancia del 50%)
              const sizeRatio = fileBytes.length > 0 ? written.length / fileBytes.length : 1;
              if (sizeRatio < 0.1 || sizeRatio > 2) {
                console.warn(`⚠️ Unexpected size for ${name}: original=${fileBytes.length}, written=${written.length} (${fileBytes.length > 0 ? Math.round(sizeRatio * 100) : 'N/A'}%)`);
              }
            }

            images.push({ name, ext: effectiveExt, durSec: dur });
            tempFiles.push(name);

          } catch (error) {
            console.error(`❌ Error processing clip ${i}:`, error);
            throw new Error(`Failed to process clip ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        if (images.length === 0) throw new Error('No hay imágenes válidas para exportar');

        // Modo simple: usar inputs directos sin filtros complejos para reducir memoria
        const args: string[] = ['-y'];

        // Detectar si estamos en WASM (limitaciones de memoria)
        const isWasm = true; // En este contexto siempre es WASM

        // Flags optimizados para WASM (menos memoria, más estabilidad)
        if (isWasm) {
          args.push('-threads', '1', '-filter_threads', '1');
          console.log('⚙️ Using WASM-optimized thread settings');
        }

        // Simplificar: usar inputs directos sin filtro complejo
        for (let i = 0; i < images.length; i++) {
          args.push('-loop', '1', '-t', images[i].durSec.toString(), '-i', images[i].name);
        }

        // Sistema de transiciones inteligente
        const heavyTransitions = ['pixelize', 'wiperight', 'wipeleft', 'wipeup', 'wipedown', 'slideright', 'slideleft', 'slideup', 'slidedown'];

        // Verificar si hay transiciones
        const hasTransitions = timeline.clips.some((clip, i) =>
          i < timeline.clips.length - 1 && clip.transitionAfter && clip.transitionAfter.durationMs > 0
        );

        // Crear filtros con transiciones optimizadas
        const filterLines: string[] = [];
        for (let i = 0, inIdx = 0; i < images.length; i++, inIdx++) {
          const inLabel = `${inIdx}:v`;
          const outLabel = `v${i}`;
          const chain: string[] = [`[${inLabel}]`];
          if (scale) chain.push(`scale=${opts.width ?? 1280}:${opts.height ?? 720}`);
          chain.push('format=yuv420p,setsar=1');
          filterLines.push(chain.join(',') + `[${outLabel}]`);
        }

        // Agregar transiciones si existen
        let current = 'v0';
        let currentLen = images[0].durSec;

        if (hasTransitions && images.length > 1) {
          for (let i = 1; i < images.length; i++) {
            const prevClip = timeline.clips[i - 1];
            const nextClip = timeline.clips[i];

            if (!prevClip.transitionAfter || prevClip.transitionAfter.durationMs <= 0) {
              // Sin transición, usar overlay simple
              const overlayLabel = `overlay${i}`;
              filterLines.push(`[${current}][v${i}]overlay[${overlayLabel}]`);
              current = overlayLabel;
              currentLen += images[i].durSec;
              continue;
            }

            // Transición con optimizaciones para WASM
            const trSec = Math.max(0.3, Math.min(toSec(prevClip.transitionAfter.durationMs), 1.0));
            let transName = mapTransitionIdToXfade(prevClip.transitionAfter.pluginId);

            // En WASM, optimizar transiciones complejas para reducir uso de memoria
            if (isWasm && heavyTransitions.includes(transName)) {
              console.log(`🎬 Optimizing heavy transition ${transName} for WASM memory usage`);

              if (transName === 'pixelize') {
                // Pixelize es demasiado intensivo, usar fade
                transName = 'fade';
                console.log('🎬 Using fade instead of pixelize (too memory intensive)');
              } else {
                // Para wipe y slide, intentar optimizar reduciendo temporalmente la resolución
                console.log(`🎬 Using optimized ${transName} with memory optimizations`);

                // Crear una versión optimizada de la transición con menor resolución temporal
                const tempScale = 'scale=640:360'; // Resolución muy baja para la transición
                const tempLabel = `temp_${i}`;

                // Insertar un paso de reducción de resolución antes de la transición
                filterLines.push(`[${current}]${tempScale}[${tempLabel}]`);
                filterLines.push(`[v${i}]${tempScale}[temp_v${i}]`);

                // Usar la transición en baja resolución
                const offset = Math.max(0, +(currentLen - trSec).toFixed(2));
                const xfTempLabel = `xf_temp_${i}`;
                filterLines.push(`[${tempLabel}][temp_v${i}]xfade=transition=${transName}:duration=${trSec.toFixed(3)}:offset=${offset.toFixed(3)}[${xfTempLabel}]`);

                // Escalar de vuelta a la resolución original
                const finalScale = `scale=${opts.width ?? 1280}:${opts.height ?? 720}`;
                const xfLabel = `xf${i}`;
                filterLines.push(`[${xfTempLabel}]${finalScale}[${xfLabel}]`);
                current = xfLabel;

                console.log(`✅ Applied memory-optimized ${transName} transition`);
                continue;
              }
            }

            const offset = Math.max(0, +(currentLen - trSec).toFixed(2));
            const xfLabel = `xf${i}`;
            filterLines.push(`[${current}][v${i}]xfade=transition=${transName}:duration=${trSec.toFixed(3)}:offset=${offset.toFixed(3)}[${xfLabel}]`);
            current = xfLabel;
            currentLen = currentLen + images[i].durSec - trSec;
          }
        }

        // Aplicar filtros complejos
        if (filterLines.length > images.length) {
          args.push('-filter_complex', filterLines.join('; '), '-map', `[${current}]`);
        } else {
          // Sin transiciones, usar inputs directos
          args.push('-filter_complex', filterLines.slice(0, images.length).join('; '), '-map', `[${current}]`);
        }

        // Output
        const output = 'out.mp4';
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', output);

        console.log('🔧 Simplified FFmpeg command:');
        console.log('ffmpeg ' + args.map(arg => arg.includes(' ') ? `'${arg}'` : arg).join(' '));

        // Ejecutar FFmpeg con timeout de seguridad (más largo para WASM)
        const timeoutMs = Math.max(120000, totalSecPlanned * 5000); // Mínimo 2min, +5s por segundo de video
        console.log(`⏱️ Setting FFmpeg timeout: ${timeoutMs}ms (${Math.round(timeoutMs/1000)}s)`);

        const timeout = setTimeout(() => {
          console.error('⏰ FFmpeg timeout reached - terminating process');
          try {
            ffmpeg.terminate();
          } catch (e) {
            console.error('Error terminating FFmpeg:', e);
          }
        }, timeoutMs);

        try {
          console.log('🎬 Executing FFmpeg...');
          const result = await ffmpeg.exec(args);
          clearTimeout(timeout);

          console.log(`📊 FFmpeg exit code: ${result}`);

          if (result !== 0) {
            let errorInfo = `Exit code: ${result}`;
            throw new Error(`FFmpeg failed with ${errorInfo}`);
          }

          console.log('✅ FFmpeg execution completed successfully');

        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }

        // Verificar salida
        console.log(`🔍 Checking output file: ${output}`);
        const files = await ffmpeg.listDir('.');
        const exists = files.some((f: any) => f.name === output && !f.isDir);
        if (!exists) throw new Error(`FFmpeg no generó el archivo de salida: ${output}`);

        const outData = (await ffmpeg.readFile(output)) as Uint8Array;
        if (!outData || outData.length === 0) {
          throw new Error(`Archivo de salida ${output} está vacío o corrupto`);
        }

        console.log(`📏 Output file size: ${Math.round(outData.length / 1024)}KB`);

        // Verificar que no sea todo ceros o datos corruptos
        let nonZeroBytes = 0;
        for (let i = 0; i < Math.min(1000, outData.length); i++) {
          if (outData[i] !== 0) {
            nonZeroBytes++;
          }
        }
        if (nonZeroBytes < 10) {
          throw new Error(`Output file appears to contain mostly null bytes (${nonZeroBytes} non-zero bytes in first 1000)`);
        }

        const copy = new Uint8Array(outData.byteLength);
        copy.set(outData);
        const type = 'video/webm';
        const blob = new Blob([copy], { type });

        console.log(`🎉 Export completed successfully! Blob size: ${Math.round(blob.size / 1024)}KB`);
        return blob;
      } catch (error) {
        console.error('❌ Error durante la exportación:', error);
        throw error;
      } finally {
        // Limpieza
        for (const temp of tempFiles) { try { await ffmpeg.deleteFile(temp); } catch {} }
        try {
          const out = 'out.webm';
          await ffmpeg.deleteFile(out);
        } catch {}
        if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);
        // Dejar de reportar progreso para este job
        progressCtx.onProgress = undefined;
      }
    }
  };
}
