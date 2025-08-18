import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { Timeline } from '@framefuse/core';
import type { ExportOptions, VideoExporter } from '@framefuse/core';
import type { FfmpegWorkerOptions } from '../types';

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error('Unsupported image data URL');
  const mime = match[1];
  const base64 = match[2];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'img';
  return { bytes, ext, mime };
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
  return Math.max(0, Math.round(ms) / 1000);
}

export function createFfmpegWorkerExporter(_options: FfmpegWorkerOptions = {}): VideoExporter {
  const ffmpeg = new FFmpeg();

  async function ensureLoaded(): Promise<void> {
    console.log('🔍 Verificando si FFmpeg está cargado...', { loaded: ffmpeg.loaded });
    if (!ffmpeg.loaded) {
      console.log('⏳ FFmpeg no está cargado, iniciando carga...');
      try {
        await ffmpeg.load();
        console.log('✅ FFmpeg cargado exitosamente');
      } catch (error) {
        console.error('❌ Error cargando FFmpeg:', error);
        throw error;
      }
    } else {
      console.log('✅ FFmpeg ya estaba cargado');
    }
  }

  return {
    async export(timeline: Timeline, opts: ExportOptions) {
      console.log('🔧 Iniciando export, cargando FFmpeg...');
      try {
        await ensureLoaded();
        console.log('✅ FFmpeg cargado correctamente');
      } catch (error) {
        console.error('❌ Error crítico cargando FFmpeg:', error);
        throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const totalMs = timeline.clips.reduce((s, c) => s + c.durationMs, 0) || 1;
      const onProgress = opts.onProgress;
      const abortSignal = opts.signal;
      
      console.log('📊 Timeline info:', {
        clips: timeline.clips.length,
        totalMs,
        firstClipSrc: timeline.clips[0]?.src?.substring(0, 50) + '...'
      });

      const abortHandler = () => {
        try {
          ffmpeg.terminate();
        } catch {}
      };
      if (abortSignal) abortSignal.addEventListener('abort', abortHandler, { once: true });

      ffmpeg.on('progress', ({ time }: any) => {
        if (typeof time === 'number' && onProgress) {
          onProgress(Math.min(1, time / (totalMs / 1000)));
        }
      });

      // Write input images
      console.log('📁 Procesando imágenes...');
      const images: { name: string; ext: string; durSec: number }[] = [];
      for (let i = 0; i < timeline.clips.length; i++) {
        const clip = timeline.clips[i];
        console.log(`📷 Procesando imagen ${i + 1}/${timeline.clips.length}`);
        
        try {
          const { bytes, ext } = dataUrlToBytes(clip.src);
          console.log(`📄 Data URL convertido: ${bytes.length} bytes, ext: ${ext}`);
          
          const name = `img_${i}.${ext}`;
          console.log(`💾 Escribiendo archivo: ${name}`);
          await ffmpeg.writeFile(name, bytes);
          console.log(`✅ Archivo ${name} escrito correctamente`);
          
          images.push({ name, ext, durSec: Math.max(0.033, toSec(clip.durationMs)) });
        } catch (error) {
          console.error(`❌ Error procesando imagen ${i}:`, error);
          throw error;
        }
      }
      console.log('✅ Todas las imágenes procesadas');

      const scale = buildScaleFilter(opts);
      const filterLines: string[] = [];

      // Prepare formatted inputs and labels
      const labels: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const inLabel = `${i}:v`;
        const outLabel = `v${i}`;
        labels.push(outLabel);
        const chain: string[] = [`[${inLabel}]format=rgba,setsar=1`];
        if (scale) chain.push(scale);
        chain.push(`[${outLabel}]`);
        filterLines.push(chain.join(','));
      }

      // Chain xfade transitions if any, else we'll concat via filter
      let current = labels[0];
      let currentLen = images[0]?.durSec ?? 0;
      for (let i = 1; i < labels.length; i++) {
        const prevClip = timeline.clips[i - 1];
        const trMs = prevClip.transitionAfter?.durationMs ?? 0;
        const tr = Math.max(0.001, toSec(trMs));
        const transName = mapTransitionIdToXfade(prevClip.transitionAfter?.pluginId);
        const offset = Math.max(0, currentLen - tr);
        const out = `vxf${i}`;
        filterLines.push(`[${current}][${labels[i]}]xfade=transition=${transName}:duration=${tr.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`);
        current = out;
        currentLen = currentLen + images[i].durSec - tr;
      }

      // Finalize output label
      const vout = current ? `vout` : `vout`;
      const tailFilters: string[] = [];
      if (opts.fps && opts.format !== 'gif') tailFilters.push(`fps=${opts.fps}`);
      tailFilters.push('format=yuv420p');
      filterLines.push(`[${current}]${tailFilters.join(',')}[${vout}]`);

      let output = 'out.webm';
      let args: string[] = [];

      // Inputs: -loop 1 -t dur -i img
      // If previewSeconds is set, limit the total duration roughly to that window
      let remainingPreview = typeof opts.previewSeconds === 'number' && opts.previewSeconds > 0 ? opts.previewSeconds : null;
      for (let i = 0; i < images.length; i++) {
        let dur = images[i].durSec;
        if (remainingPreview !== null) {
          if (remainingPreview <= 0) { dur = 0.033; } else if (remainingPreview < dur) { dur = remainingPreview; }
          remainingPreview = Math.max(0, remainingPreview - images[i].durSec);
        }
        args = args.concat(['-loop', '1', '-t', dur.toString(), '-i', images[i].name]);
      }

      if (opts.format === 'gif') {
        output = 'out.gif';
        // For GIF, palette on the final composite
        const base = filterLines.join('; ');
        const fpsFilter = opts.fps ? `fps=${opts.fps}` : '';
        const palOpts: string[] = [];
        if (opts.gifColors) palOpts.push(`max_colors=${opts.gifColors}`);
        if (opts.gifPaletteStatsMode) palOpts.push(`stats_mode=${opts.gifPaletteStatsMode}`);
        const palettegen = `palettegen${palOpts.length ? '=' + palOpts.join(':') : ''}`;
        let ditherExpr = '';
        if (opts.gifDitherType && opts.gifDitherType !== 'none') {
          if (opts.gifDitherType === 'bayer') {
            const scale = typeof opts.gifBayerScale === 'number' ? Math.min(5, Math.max(1, Math.round(opts.gifBayerScale))) : 3;
            ditherExpr = `=dither=bayer:bayer_scale=${scale}`;
          } else {
            ditherExpr = `=dither=${opts.gifDitherType}`;
          }
        } else if (opts.gifDither) {
          ditherExpr = '=dither=sierra2_4a';
        }
        const palette = `[${vout}]${fpsFilter ? fpsFilter + ',' : ''}split [a][b]; [a]${palettegen} [p]; [b][p]paletteuse${ditherExpr}[vgif]`;
        args = args.concat(['-filter_complex', `${base}; ${palette}`]);
        if (opts.gifLoop) args = args.concat(['-loop', '0']);
        args = args.concat(['-map', '[vgif]', output]);
      } else if (opts.format === 'mp4') {
        output = 'out.mp4';
        args = args.concat(['-filter_complex', filterLines.join('; '), '-map', `[${vout}]`, '-c:v', 'libx264']);
        if (opts.speedPreset) args = args.concat(['-preset', opts.speedPreset]);
        if (typeof opts.crf === 'number') args = args.concat(['-crf', String(opts.crf)]);
        else if (typeof opts.bitrateKbps === 'number') args = args.concat(['-b:v', `${opts.bitrateKbps}k`]);
        args = args.concat(['-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
      } else {
        // webm
        output = 'out.webm';
        args = args.concat(['-filter_complex', filterLines.join('; '), '-map', `[${vout}]`, '-c:v', 'libvpx-vp9']);
        if (typeof opts.crf === 'number') args = args.concat(['-crf', String(opts.crf), '-b:v', '0']);
        else if (typeof opts.bitrateKbps === 'number') args = args.concat(['-b:v', `${opts.bitrateKbps}k`]);
        args = args.concat(['-pix_fmt', 'yuv420p', output]);
      }

      try {
        console.log('🎬 Ejecutando comando FFmpeg:', args.join(' '));
        await ffmpeg.exec(args);
        console.log('✅ Comando FFmpeg completado');
        
        // Listar archivos para debugging
        const files = await ffmpeg.listDir('.');
        console.log('📂 Archivos disponibles después de FFmpeg:');
        files.forEach((file: any) => {
          console.log(`  - ${file.name} (${file.isDir ? 'dir' : 'file'})`);
        });
        
        console.log('📖 Leyendo archivo de salida:', output);
        const data = (await ffmpeg.readFile(output)) as Uint8Array;
        // Create a plain Uint8Array copy to avoid SharedArrayBuffer typing issues
        const copy = new Uint8Array(data.byteLength);
        copy.set(data);
        const type = opts.format === 'gif' ? 'image/gif' : `video/${opts.format}`;
        return new Blob([copy], { type });
      } finally {
        if (abortSignal) abortSignal.removeEventListener('abort', abortHandler);
      }
    }
  };
}


