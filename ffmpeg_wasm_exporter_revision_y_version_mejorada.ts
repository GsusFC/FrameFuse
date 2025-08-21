import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { Timeline } from '@framefuse/core';
import type { ExportOptions, VideoExporter } from '@framefuse/core';
import type { FfmpegWorkerOptions } from './packages/ffmpeg-worker/src/types';

/**
 * Mejoras clave frente a tu versión:
 * 1) Duraciones PRE-RECORTADAS cuando hay previewSeconds (y progresos exactos)
 * 2) Fallback automático a WebM/VP9 si libx264 no está disponible en ffmpeg.wasm
 * 3) Listeners de progreso/log sin fugas (un único listener global y contexto actual)
 * 4) Más mime/ext soportados (webp/avif/gif/bmp/svg). Fallback a re-encode PNG en navegador si hace falta
 * 5) Validaciones y mensajes de error más claros; limpieza robusta
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
  // Soportamos data:[mime];base64,... y data:[mime];utf8,...
  const base64Match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  const utf8Match = dataUrl.match(/^data:([^;]+);([^,]*),(.*)$/);

  if (base64Match) {
    const mime = base64Match[1];
    const base64 = base64Match[2];
    const estimatedSize = (base64.length * 3) / 4;
    const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB por imagen
    if (estimatedSize > MAX_IMAGE_SIZE) {
      throw new Error(`Imagen demasiado grande: ${Math.round(estimatedSize / 1024 / 1024)}MB. Máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, ext: guessExt(mime), mime };
  }

  if (utf8Match) {
    // Último recurso: dejamos que el navegador lo decodifique y re-encode a PNG (para SVG/AVIF sin soporte en ffmpeg wasm)
    const mime = utf8Match[1];
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // Intentamos pasar tal cual primero
    const array = new Uint8Array(await blob.arrayBuffer());
    const ext = guessExt(blob.type || mime);
    return { bytes: array, ext, mime: blob.type || mime };
  }

  throw new Error('Unsupported image data URL');
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

  async function canEncodeMp4(): Promise<boolean> {
    if (mp4Support !== null) return mp4Support;
    try {
      // Pequeña prueba de 1s para validar libx264 en este build
      await ffmpeg.writeFile('c.black', new Uint8Array()); // no importa, generamos con lavfi
      await ffmpeg.exec(['-f','lavfi','-i','color=size=16x16:rate=1:color=black','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','t.mp4']);
      await ffmpeg.deleteFile('t.mp4');
      mp4Support = true;
    } catch {
      mp4Support = false;
    } finally {
      try { await ffmpeg.deleteFile('c.black'); } catch {}
    }
    return mp4Support;
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
        throw new Error(`Memoria total estimada demasiado grande: ${Math.round(totalEstimatedMemory / 1024 / 1024)}MB. Máximo: ${MAX_TOTAL_MEMORY / 1024 / 1024}MB`);
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
          if (!dur || dur <= 0) continue; // saltar clips sin duración tras preview

          const { bytes, ext, mime } = await dataUrlToBytes(clip.src);
          if (!bytes || bytes.length === 0) throw new Error(`Clip ${i}: buffer vacío o corrupto`);

          let effectiveExt = ext;
          // Algunos builds de ffmpeg.wasm no traen decoders para AVIF; re-encode a PNG vía Canvas
          if (ext === 'avif' || ext === 'svg') {
            try {
              const blob = new Blob([bytes], { type: mime });
              const bmp = await createImageBitmap(blob);
              const cnv = new OffscreenCanvas(bmp.width, bmp.height);
              const ctx = cnv.getContext('2d');
              if (!ctx) throw new Error('2D context no disponible');
              ctx.drawImage(bmp, 0, 0);
              const png = await cnv.convertToBlob({ type: 'image/png' });
              const arr = new Uint8Array(await png.arrayBuffer());
              await ffmpeg.writeFile(`img_${i}.png`, arr);
              images.push({ name: `img_${i}.png`, ext: 'png', durSec: dur });
              tempFiles.push(`img_${i}.png`);
              continue;
            } catch (e) {
              console.warn(`Fallo re-encode ${ext}→png, intentamos pasar original:`, e);
            }
          }

          const name = `img_${i}.${effectiveExt}`;
          await ffmpeg.writeFile(name, bytes);
          // Verificar
          const written = await ffmpeg.readFile(name);
          if (!written || written.length !== bytes.length) {
            throw new Error(`Archivo ${name} no se escribió correctamente`);
          }
          images.push({ name, ext: effectiveExt, durSec: dur });
          tempFiles.push(name);
        }

        if (images.length === 0) throw new Error('No hay imágenes válidas para exportar');

        // Construcción de grafo de filtros
        const filterLines: string[] = [];
        const labels: string[] = [];
        for (let i = 0, inIdx = 0; i < images.length; i++, inIdx++) {
          const inLabel = `${inIdx}:v`;
          const outLabel = `v${i}`;
          labels.push(outLabel);
          const chain: string[] = [`[${inLabel}]format=rgba,setsar=1`];
          if (scale) chain.push(scale);
          filterLines.push(chain.join(',') + `[${outLabel}]`);
        }

        // ¿Hay transiciones útiles?
        let hasTransitions = false;
        for (let i = 0, tIdx = 0; i < timeline.clips.length - 1 && tIdx < images.length - 1; i++) {
          const c = timeline.clips[i];
          if (c.transitionAfter && c.transitionAfter.durationMs > 0) { hasTransitions = true; break; }
        }

        let current = labels[0];
        let currentLen = images[0].durSec;

        if (hasTransitions && labels.length > 1) {
          for (let i = 1; i < labels.length; i++) {
            const originalIdx = i - 1; // índice correspondiente en timeline
            const prevClip = timeline.clips[originalIdx];
            const trSec = prevClip.transitionAfter?.durationMs ? Math.max(0.3, toSec(prevClip.transitionAfter.durationMs)) : 0;

            if (trSec > 0 && trSec < images[originalIdx].durSec * 0.8) {
              const offset = Math.max(0, +(currentLen - trSec).toFixed(2));
              const transName = mapTransitionIdToXfade(prevClip.transitionAfter?.pluginId);
              const out = `vxf${i}`;
              filterLines.push(`[${current}][${labels[i]}]xfade=transition=${transName}:duration=${trSec.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`);
              current = out;
              currentLen = currentLen + images[i].durSec - trSec;
            } else {
              const out = `vconcat${i}`;
              filterLines.push(`[${current}][${labels[i]}]concat=n=2:v=1:a=0[${out}]`);
              current = out;
              currentLen += images[i].durSec;
            }
          }
        } else if (labels.length > 1) {
          const out = `vconcat_all`;
          filterLines.push(labels.map(l => `[${l}]`).join('') + `concat=n=${labels.length}:v=1:a=0[${out}]`);
          current = out;
        }

        // Cola final
        const vout = `vout_${Date.now()}`;
        const tail: string[] = [];
        if (opts.fps && opts.format !== 'gif') tail.push(`fps=${opts.fps}`);
        tail.push('format=yuv420p');
        filterLines.push(`[${current}]${tail.join(',')}[${vout}]`);

        // Entradas: -loop 1 -t dur -i file
        const args: string[] = ['-y'];
        for (let i = 0; i < images.length; i++) {
          args.push('-loop','1','-t', images[i].durSec.toString(), '-i', images[i].name);
        }

        // Salida
        let targetFormat: 'gif' | 'mp4' | 'webm' = (opts.format as any) || 'webm';
        if (targetFormat === 'mp4' && !(await canEncodeMp4())) {
          console.warn('⚠️ Este build de ffmpeg.wasm no soporta libx264. Se usará WebM/VP9 en su lugar.');
          targetFormat = 'webm';
        }

        let output = targetFormat === 'gif' ? 'out.gif' : targetFormat === 'mp4' ? 'out.mp4' : 'out.webm';

        if (targetFormat === 'gif') {
          const base = filterLines.join('; ');
          const palOpts: string[] = [];
          if (opts.gifColors) palOpts.push(`max_colors=${opts.gifColors}`);
          if (opts.gifPaletteStatsMode) palOpts.push(`stats_mode=${opts.gifPaletteStatsMode}`);
          const palettegen = `palettegen${palOpts.length ? '=' + palOpts.join(':') : ''}`;
          const dither = opts.gifDitherType && opts.gifDitherType !== 'none'
            ? (opts.gifDitherType === 'bayer' ? `=dither=bayer:bayer_scale=${Math.max(1, Math.min(5, Math.round(opts.gifBayerScale ?? 3)))}` : `=dither=${opts.gifDitherType}`)
            : (opts.gifDither ? '=dither=sierra2_4a' : '');
          const fpsFilter = opts.fps ? `fps=${opts.fps},` : '';
          const palette = `[${vout}]${fpsFilter}split [a][b]; [a]${palettegen} [p]; [b][p]paletteuse${dither}[vgif]`;
          args.push('-filter_complex', `${base}; ${palette}`);
          if (opts.gifLoop) args.push('-loop','0');
          args.push('-map','[vgif]', output);
        } else if (targetFormat === 'mp4') {
          args.push('-filter_complex', filterLines.join('; '), '-map', `[${vout}]`, '-c:v', 'libx264');
          if (opts.speedPreset) args.push('-preset', opts.speedPreset);
          if (typeof opts.crf === 'number') args.push('-crf', String(opts.crf));
          else if (typeof opts.bitrateKbps === 'number') args.push('-b:v', `${opts.bitrateKbps}k`);
          args.push('-pix_fmt','yuv420p','-movflags','+faststart', output);
        } else {
          // webm/VP9 (más compatible en wasm)
          args.push('-filter_complex', filterLines.join('; '), '-map', `[${vout}]`, '-c:v', 'libvpx-vp9');
          if (typeof opts.crf === 'number') args.push('-crf', String(opts.crf), '-b:v','0');
          else if (typeof opts.bitrateKbps === 'number') args.push('-b:v', `${opts.bitrateKbps}k`);
          args.push('-pix_fmt','yuv420p', output);
        }

        await ffmpeg.exec(args);

        // Verificar salida
        const files = await ffmpeg.listDir('.');
        const exists = files.some((f: any) => f.name === output && !f.isDir);
        if (!exists) throw new Error(`FFmpeg no generó el archivo de salida: ${output}`);

        const outData = (await ffmpeg.readFile(output)) as Uint8Array;
        if (!outData || outData.length === 0) throw new Error(`Archivo de salida ${output} está vacío o corrupto`);

        const copy = new Uint8Array(outData.byteLength); copy.set(outData);
        const type = targetFormat === 'gif' ? 'image/gif' : `video/${targetFormat}`;
        return new Blob([copy], { type });
      } catch (error) {
        console.error('❌ Error durante la exportación:', error);
        throw error;
      } finally {
        // Limpieza
        for (const temp of tempFiles) { try { await ffmpeg.deleteFile(temp); } catch {} }
        try {
          const out = (opts.format === 'gif') ? 'out.gif' : (opts.format === 'mp4') ? 'out.mp4' : 'out.webm';
          await ffmpeg.deleteFile(out);
        } catch {}
        if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);
        // Dejar de reportar progreso para este job
        progressCtx.onProgress = undefined;
      }
    }
  };
}
