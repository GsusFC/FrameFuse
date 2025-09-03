import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { Button } from '@framefuse/ui-kit';
import { API_BASE } from '../../config';
// Lazy import para code-splitting y carga bajo demanda del worker/FFmpeg

export function ExportPanel() {
  const clips = useUploadStore((s) => s.clips);
  const [format, setFormat] = React.useState<'webm' | 'mp4' | 'gif'>('webm');
  const [fps, setFps] = React.useState(30);
  const [preset, setPreset] = React.useState<'fast' | 'balanced' | 'quality' | 'manual'>('balanced');
  const [width, setWidth] = React.useState<number | undefined>(undefined);
  const [height, setHeight] = React.useState<number | undefined>(undefined);
  const [scaleMode, setScaleMode] = React.useState<'fit' | 'cover'>('fit');
  const [crf, setCrf] = React.useState<number | undefined>(23);
  const [bitrate, setBitrate] = React.useState<number | undefined>(undefined);
  const [speedPreset, setSpeedPreset] = React.useState<string>('medium');
  // Estrategia de export del backend y debug
  const [exportStrategy, setExportStrategy] = React.useState<'segments' | 'xfade'>('segments');
  const [debugExport, setDebugExport] = React.useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false);
  const [keyint, setKeyint] = React.useState<number | undefined>(undefined);
  const [gifColors, setGifColors] = React.useState(256);
  const [gifDither, setGifDither] = React.useState(true);
  const [gifDitherType, setGifDitherType] = React.useState<'none' | 'bayer' | 'sierra2' | 'sierra2_4a' | 'floyd_steinberg'>('sierra2_4a');
  const [gifBayerScale, setGifBayerScale] = React.useState<number>(3);
  const [gifPaletteStatsMode, setGifPaletteStatsMode] = React.useState<'full' | 'diff'>('full');
  const [gifReserveTransparency, setGifReserveTransparency] = React.useState<boolean>(false);
  const [gifLoop, setGifLoop] = React.useState(true);
  const [filename, setFilename] = React.useState('export');
  const [previewSeconds, setPreviewSeconds] = React.useState<number | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [controller, setController] = React.useState<AbortController | null>(null);
  const [estBusy, setEstBusy] = React.useState(false);
  const [estProgress, setEstProgress] = React.useState(0);
  const [estSizeBytes, setEstSizeBytes] = React.useState<number | null>(null);
  const [estSecondsUsed, setEstSecondsUsed] = React.useState<number | null>(null);
  const [estController, setEstController] = React.useState<AbortController | null>(null);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const elapsedSec = startTime ? (Date.now() - startTime) / 1000 : 0;
  const etaSec = progress > 0 ? Math.max(0, (elapsedSec / progress) * (1 - progress)) : null;
  const totalSec = Math.max(0.001, clips.reduce((s, c) => s + c.durationMs, 0) / 1000);
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // API base centralizada (apps/web/src/config.ts)

  // Función para validar configuración antes de exportar
  function validateExportSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (format === 'gif') {
      if (gifColors < 2 || gifColors > 256) {
        errors.push(`Colores GIF debe estar entre 2 y 256 (actual: ${gifColors})`);
      }
      if (fps < 1 || fps > 60) {
        errors.push(`FPS debe estar entre 1 y 60 (actual: ${fps})`);
      }
    }

    if (width && (width < 1 || width > 7680)) {
      errors.push(`Ancho debe estar entre 1 y 7680 píxeles (actual: ${width})`);
    }

    if (height && (height < 1 || height > 4320)) {
      errors.push(`Alto debe estar entre 1 y 4320 píxeles (actual: ${height})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  function applyPreset(nextPreset: 'fast' | 'balanced' | 'quality' | 'manual', f: 'webm' | 'mp4' | 'gif') {
    if (nextPreset === 'manual') { setPreset('manual'); return; }
    setPreset(nextPreset);
    if (f === 'webm') {
      if (nextPreset === 'fast') {
        setCrf(34); setBitrate(undefined); setSpeedPreset('fast'); setFps(30); setWidth(undefined); setHeight(undefined);
      } else if (nextPreset === 'balanced') {
        setCrf(30); setBitrate(undefined); setSpeedPreset('medium'); setFps(30); setWidth(undefined); setHeight(undefined);
      } else {
        setCrf(24); setBitrate(undefined); setSpeedPreset('slow'); setFps(30); setWidth(undefined); setHeight(undefined);
      }
    } else if (f === 'mp4') {
      if (nextPreset === 'fast') {
        setCrf(undefined); setBitrate(6000); setSpeedPreset('fast'); setFps(30);
      } else if (nextPreset === 'balanced') {
        setCrf(23); setBitrate(undefined); setSpeedPreset('medium'); setFps(30);
      } else {
        setCrf(20); setBitrate(undefined); setSpeedPreset('slow'); setFps(30);
      }
      } else {
      if (nextPreset === 'fast') {
        setFps(12); setWidth(1280); setHeight(720); setScaleMode('fit'); setGifColors(128); setGifDither(true); setGifDitherType('sierra2_4a'); setGifPaletteStatsMode('full'); setGifBayerScale(3);
      } else if (nextPreset === 'balanced') {
        setFps(15); setWidth(1920); setHeight(1080); setScaleMode('fit'); setGifColors(128); setGifDither(true); setGifDitherType('sierra2_4a'); setGifPaletteStatsMode('full'); setGifBayerScale(3);
      } else {
        setFps(24); setWidth(1920); setHeight(1080); setScaleMode('fit'); setGifColors(256); setGifDither(true); setGifDitherType('sierra2_4a'); setGifPaletteStatsMode('full'); setGifBayerScale(3);
      }
    }
  }

  const ensureManual = () => { if (preset !== 'manual') setPreset('manual'); };

  React.useEffect(() => {
    // Reaplicar valores del preset cuando cambie el formato
    applyPreset(preset, format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  return (
    <div className="border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full overflow-y-auto overflow-x-hidden">
      <h2 className="font-semibold">Exportar</h2>
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant={format === 'webm' ? 'accent' : 'outline'}
            className={format === 'webm' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}
            aria-pressed={format === 'webm'}
            onClick={() => setFormat('webm')}
          >
            WebM
          </Button>
          <Button
            size="sm"
            variant={format === 'mp4' ? 'accent' : 'outline'}
            className={format === 'mp4' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}
            aria-pressed={format === 'mp4'}
            onClick={() => setFormat('mp4')}
          >
            MP4
          </Button>
          <Button
            size="sm"
            variant={format === 'gif' ? 'accent' : 'outline'}
            className={format === 'gif' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}
            aria-pressed={format === 'gif'}
            onClick={() => setFormat('gif')}
          >
            GIF
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-[var(--text-muted)]">FPS</label>
            <input type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20" value={fps} onChange={(e) => setFps(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant={preset === 'fast' ? 'primary' : 'outline'}
            className={preset === 'fast' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]'}
            aria-pressed={preset === 'fast'}
            onClick={() => applyPreset('fast', format)}
          >
            Rápido
          </Button>
          <Button
            size="sm"
            variant={preset === 'balanced' ? 'primary' : 'outline'}
            className={preset === 'balanced' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]'}
            aria-pressed={preset === 'balanced'}
            onClick={() => applyPreset('balanced', format)}
          >
            Equilibrado
          </Button>
          <Button
            size="sm"
            variant={preset === 'quality' ? 'primary' : 'outline'}
            className={preset === 'quality' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]'}
            aria-pressed={preset === 'quality'}
            onClick={() => applyPreset('quality', format)}
          >
            Calidad
          </Button>
          <Button
            size="sm"
            variant={preset === 'manual' ? 'primary' : 'outline'}
            className={preset === 'manual' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]'}
            aria-pressed={preset === 'manual'}
            onClick={() => applyPreset('manual', format)}
          >
            Manual
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-[var(--text-muted)]">Resolución</label>
          <input placeholder="auto" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={width ?? ''} onFocus={ensureManual} onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : undefined)} />
          <span className="text-[var(--text-muted)]">x</span>
          <input placeholder="auto" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={height ?? ''} onFocus={ensureManual} onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : undefined)} />
          <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1" value={scaleMode} onMouseDown={ensureManual} onChange={(e) => setScaleMode(e.target.value as any)}>
            <option value="fit">Fit</option>
            <option value="cover">Cover</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[var(--text-muted)] text-xs">Opciones avanzadas</div>
          <Button size="sm" variant="outline" onClick={() => setShowAdvanced(v => !v)}>{showAdvanced ? 'Ocultar' : 'Mostrar'}</Button>
        </div>
        {showAdvanced && (
          <div className="space-y-3 border border-[var(--border)] rounded p-2 bg-[var(--surface)]">
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-muted)] text-xs">Calidad (CRF o bitrate)</label>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="CRF" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={crf ?? ''} onFocus={ensureManual} onChange={(e) => setCrf(e.target.value ? Number(e.target.value) : undefined)} />
                <input placeholder="kbps" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={bitrate ?? ''} onFocus={ensureManual} onChange={(e) => setBitrate(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-muted)] text-xs">Preset</label>
              <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={speedPreset} onMouseDown={ensureManual} onChange={(e) => setSpeedPreset(e.target.value)}>
                {['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-muted)] text-xs">Keyint</label>
              <input placeholder="auto" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={keyint ?? ''} onFocus={ensureManual} onChange={(e) => setKeyint(e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-muted)] text-xs">Estrategia</label>
              <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={exportStrategy} onChange={(e) => setExportStrategy(e.target.value as 'segments' | 'xfade')}>
                <option value="segments">Segments (recomendado)</option>
                <option value="xfade">Xfade secuencial</option>
              </select>
              <label className="flex items-center gap-2 text-[var(--text-muted)]"><input type="checkbox" checked={debugExport} onChange={(e) => setDebugExport(e.target.checked)} /> Debug</label>
            </div>
          </div>
        )}
        {format === 'gif' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <label className="text-[var(--text-muted)]">GIF</label>
              <div className="relative">
                <input
                  type="number"
                  className={`border rounded px-2 py-1 w-24 ${
                    gifColors < 2 || gifColors > 256
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-[var(--border)] bg-[var(--panel)]'
                  }`}
                  value={gifColors}
                  min={2}
                  max={256}
                  aria-invalid={gifColors < 2 || gifColors > 256}
                  onFocus={ensureManual}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    // Limitar automáticamente el valor al rango válido
                    if (value >= 2 && value <= 256) {
                      setGifColors(value);
                    } else if (value > 256) {
                      setGifColors(256);
                    } else if (value < 2 && value > 0) {
                      setGifColors(2);
                    } else if (e.target.value === '') {
                      setGifColors(256); // Valor por defecto
                    }
                  }}
                  onBlur={(e) => {
                    // Asegurar valor válido al perder el foco
                    const value = Number(e.target.value);
                    if (isNaN(value) || value < 2) {
                      setGifColors(2);
                    } else if (value > 256) {
                      setGifColors(256);
                    }
                  }}
                />
                {(gifColors < 2 || gifColors > 256) && (
                  <div className="absolute -bottom-5 left-0 text-xs text-red-600">
                    Rango: 2-256 colores
                  </div>
                )}
              </div>
              <span className="text-[var(--text-muted)] text-xs">colores</span>
              <label className="flex items-center gap-2 text-[var(--text-muted)]"><input type="checkbox" checked={gifLoop} onChange={(e) => { ensureManual(); setGifLoop(e.target.checked); }} /> Loop</label>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-[var(--text-muted)]">Dither</label>
              <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1" value={gifDitherType} onMouseDown={ensureManual} onChange={(e) => { const v = e.target.value as any; setGifDitherType(v); setGifDither(v !== 'none'); }}>
                <option value="none">none</option>
                <option value="bayer">bayer</option>
                <option value="sierra2">sierra2</option>
                <option value="sierra2_4a">sierra2_4a</option>
                <option value="floyd_steinberg">floyd_steinberg</option>
              </select>
              {gifDitherType === 'bayer' && (
                <>
                  <label className="text-[var(--text-muted)]">bayer_scale</label>
                  <input type="number" min={1} max={5} className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20" value={gifBayerScale} onChange={(e) => setGifBayerScale(Number(e.target.value))} />
                </>
              )}
              <label className="text-[var(--text-muted)]">stats</label>
              <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1" value={gifPaletteStatsMode} onChange={(e) => setGifPaletteStatsMode(e.target.value as any)}>
                <option value="full">full</option>
                <option value="diff">diff</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-[var(--text-muted)]">Preview (s)</label>
              <input placeholder="full" type="number" min={1} className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={previewSeconds ?? ''} onChange={(e) => setPreviewSeconds(e.target.value ? Number(e.target.value) : undefined)} />
              <span className="text-[var(--text-muted)]">(export rápido de prueba)</span>
            </div>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <label className="text-[var(--text-muted)]">Nombre</label>
          <input className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full" value={filename} onChange={(e) => setFilename(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        {/* Botón único: Exportar con API optimizada */}
        <button
          type="button"
          disabled={!clips.length || busy}
          className="w-full rounded border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm font-medium disabled:opacity-50"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;

            // Validar configuración antes de proceder
            const validation = validateExportSettings();
            if (!validation.isValid) {
              alert(`❌ Configuración inválida:\n\n${validation.errors.join('\n')}\n\nPor favor, corrige estos valores antes de exportar.`);
              return;
            }

            console.log('🌐 Iniciando exportación con API...');
            setBusy(true);
            setProgress(0);
            setStartTime(Date.now());
            try {
              // Comprimir imágenes antes de enviar para evitar error 413
              const compressedClips = await Promise.all(clips.map(async (clip, index) => {
                console.log(`🗜️ Comprimiendo imagen ${index + 1}/${clips.length}...`);
                setProgress((index + 0.5) / (clips.length * 2)); // 50% del progreso para compresión

                try {
                  return await new Promise<any>((resolve, reject) => {
                    const img = new Image();
                    // Prevent canvas taint for CORS-enabled assets
                    img.crossOrigin = 'anonymous';

                    img.onload = () => {
                      try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                          console.error(`❌ Canvas 2D context not available for clip ${index + 1}`);
                          reject(new Error(`Canvas 2D context not available for clip ${index + 1}`));
                          return;
                        }

                        // Reducir resolución para optimizar payload
                        const maxWidth = 1280;
                        const maxHeight = 720;
                        let { width: imgWidth, height: imgHeight } = img;

                        if (imgWidth > maxWidth || imgHeight > maxHeight) {
                          const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                          imgWidth *= ratio;
                          imgHeight *= ratio;
                        }

                        canvas.width = imgWidth;
                        canvas.height = imgHeight;
                        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

                        // Comprimir a JPEG con calidad 0.8
                        const compressedData = canvas.toDataURL('image/jpeg', 0.8);
                        if (!compressedData || compressedData === 'data:,') {
                          console.error(`❌ Failed to generate compressed data for clip ${index + 1}`);
                          reject(new Error(`Failed to generate compressed data for clip ${index + 1}`));
                          return;
                        }

                        resolve({
                          imageData: compressedData,
                          durationMs: clip.durationMs,
                          transitionAfter: clip.transitionAfter
                        });
                      } catch (canvasError) {
                        console.error(`❌ Canvas operation failed for clip ${index + 1}:`, canvasError);
                        reject(new Error(`Canvas operation failed for clip ${index + 1}: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`));
                      }
                    };

                    img.onerror = () => {
                      console.error(`❌ Image failed to load for clip ${index + 1}: ${clip.src}`);
                      reject(new Error(`Image failed to load for clip ${index + 1}`));
                    };

                    img.src = clip.src;
                  });
                } catch (error) {
                  console.error(`❌ Image compression failed for clip ${index + 1}:`, error);
                  // Return a placeholder object instead of failing the entire export
                  return {
                    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
                    durationMs: clip.durationMs,
                    transitionAfter: clip.transitionAfter,
                    error: `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                  };
                }
              }));

              const project = { clips: compressedClips };

              console.log('📤 Enviando proyecto a API:', {
                clips: project.clips.length,
                format,
                fps,
                resolution: `${width || 1920}x${height || 1080}`,
                totalSize: JSON.stringify(project).length + ' chars'
              });

              setProgress(0.5); // 50% completado con compresión

              // Create AbortController for timeout and cancellation
              const controller = new AbortController();
              setController(controller);

              // Set up timeout (5 minutes for video rendering)
              const timeoutId = setTimeout(() => {
                controller.abort();
              }, 5 * 60 * 1000);

              let blob: Blob;

              try {
                const response = await fetch(`${API_BASE}/api/render`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    project,
                    format,
                    fps,
                    width: width || 1920,
                    height: height || 1080,
                    // Opciones de backend
                    strategy: exportStrategy,
                    // Mapea el CRF y preset de velocidad al backend
                    crf: (crf ?? 30).toString(),
                    preset: speedPreset,
                    debug: debugExport
                  }),
                  signal: controller.signal
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`API error: ${response.status} - ${errorText}`);
                }

                console.log('✅ Respuesta de API recibida');
                setProgress(0.8);

                blob = await response.blob();
                console.log('✅ Video renderizado, tamaño:', formatBytes(blob.size));
                setProgress(1);
              } catch (fetchError) {
                // Clear timeout
                clearTimeout(timeoutId);

                // Handle different types of errors
                if (fetchError instanceof Error) {
                  if (fetchError.name === 'AbortError') {
                    // Check if it was due to timeout or manual cancellation
                    const wasTimeout = controller.signal.aborted && !controller.signal.reason;
                    if (wasTimeout) {
                      throw new Error('Request timed out after 5 minutes. The video rendering took too long.');
                    } else {
                      throw new Error('Request was cancelled by user.');
                    }
                  } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                    throw new Error('Network error: Unable to connect to the rendering service. Please check your internet connection and try again.');
                  } else {
                    // Re-throw other fetch errors (like API errors we already handled above)
                    throw fetchError;
                  }
                } else {
                  throw new Error(`Unexpected error during API request: ${String(fetchError)}`);
                }
              } finally {
                // Always clear the timeout
                clearTimeout(timeoutId);
                // Clear controller reference
                setController(null);
              }
              
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename || 'export'}.${format}`;
              a.click();
              URL.revokeObjectURL(url);
              console.log('💾 Descarga iniciada');
            } catch (e) {
              console.error('❌ Error durante exportación:', e);
              alert(`Error durante la exportación: ${e instanceof Error ? e.message : 'Error desconocido'}`);
            } finally {
              setBusy(false);
              setProgress(0);
              setStartTime(null);
            }
          }}
        >
          {busy ? 'Exportando…' : 'Exportar Video'}
        </button>

        {busy && controller && (
          <Button variant="outline" onClick={() => controller.abort()}>Cancel</Button>
        )}
      </div>
      {busy && (
        <div className="space-y-1">
          <div className="w-full h-2 rounded bg-[var(--panel)] border border-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{Math.round(progress * 100)}%</span>
            <span>{etaSec !== null ? `~${Math.max(1, Math.round(etaSec))}s restantes` : ''}</span>
          </div>
        </div>
      )}
      {format === 'gif' && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={!clips.length || estBusy} onClick={async () => {
              setEstBusy(true);
              setEstProgress(0);
              setEstSizeBytes(null);
              setEstSecondsUsed(null);
              const ctrl = new AbortController();
              setEstController(ctrl);
              try {
                const { createFfmpegWorkerExporter } = await import('@framefuse/ffmpeg-worker');
                const exporter = createFfmpegWorkerExporter();
                const seconds = previewSeconds && previewSeconds > 0 ? previewSeconds : 2;
                const blob = await exporter.export(
                  { clips },
                  {
                    format: 'gif',
                    fps,
                    width,
                    height,
                    scaleMode,
                    gifColors,
                    gifDither,
                    gifDitherType,
                    gifBayerScale,
                    gifPaletteStatsMode,
                    gifLoop,
                    filename,
                    previewSeconds: seconds,
                    onProgress: (p: number) => setEstProgress(p),
                    signal: ctrl.signal
                  }
                );
                setEstSizeBytes(blob.size);
                setEstSecondsUsed(seconds);
              } catch {}
              finally {
                setEstBusy(false);
                setEstController(null);
                setEstProgress(0);
              }
            }}>Estimar tamaño</Button>
            {estBusy && (
              <Button size="sm" variant="outline" onClick={() => estController?.abort()}>Cancelar</Button>
            )}
          </div>
          {estSizeBytes !== null && estSecondsUsed !== null && (
            <div className="text-xs text-[var(--text-muted)]">
              <span>Estimación: <span className="text-[var(--text)]">{formatBytes(estSizeBytes)}</span> para {estSecondsUsed}s</span>
              <span className="mx-2">·</span>
              <span>Proyección aprox.: <span className="text-[var(--text)]">{formatBytes(estSizeBytes * (totalSec / estSecondsUsed))}</span> para {Math.round(totalSec)}s</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
