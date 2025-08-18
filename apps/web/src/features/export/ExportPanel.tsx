import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { Button } from '@framefuse/ui-kit';
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
        <div className="flex gap-2 items-center">
          <label className="text-[var(--text-muted)]">Calidad</label>
          <input placeholder="CRF" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20" value={crf ?? ''} onFocus={ensureManual} onChange={(e) => setCrf(e.target.value ? Number(e.target.value) : undefined)} />
          <span className="text-[var(--text-muted)]">o</span>
          <input placeholder="kbps" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={bitrate ?? ''} onFocus={ensureManual} onChange={(e) => setBitrate(e.target.value ? Number(e.target.value) : undefined)} />
          <label className="text-[var(--text-muted)]">Preset</label>
          <select className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1" value={speedPreset} onMouseDown={ensureManual} onChange={(e) => setSpeedPreset(e.target.value)}>
            {['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <label className="text-[var(--text-muted)]">Keyint</label>
          <input placeholder="auto" type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={keyint ?? ''} onFocus={ensureManual} onChange={(e) => setKeyint(e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        {format === 'gif' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <label className="text-[var(--text-muted)]">GIF</label>
              <input type="number" className="border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24" value={gifColors} min={2} max={256} onFocus={ensureManual} onChange={(e) => setGifColors(Number(e.target.value))} />
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
      <div className="flex items-center gap-2">
        <button
          disabled={!clips.length || busy}
          className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setProgress(0);
            setStartTime(Date.now());
            const ctrl = new AbortController();
            setController(ctrl);
            try {
              const { createFfmpegWorkerExporter } = await import('@framefuse/ffmpeg-worker');
              const exporter = createFfmpegWorkerExporter();
              const blob = await exporter.export(
                { clips },
                {
                  format,
                  fps,
                  width,
                  height,
                  scaleMode,
                  crf,
                  bitrateKbps: bitrate,
                  speedPreset,
                  keyframeInterval: keyint,
                  gifColors,
                  gifDither,
                  gifLoop,
                  gifDitherType,
                  gifBayerScale,
                  gifPaletteStatsMode,
                  filename,
                  previewSeconds,
                  onProgress: (p: number) => setProgress(p),
                  signal: ctrl.signal
                }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename || 'export'}.${format}`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              // Si se canceló, no hacer nada
            } finally {
              setBusy(false);
              setController(null);
              setProgress(0);
              setStartTime(null);
            }
          }}
        >
          {busy ? 'Exportando…' : 'Exportar'}
        </button>
        {busy && (
          <Button variant="outline" onClick={() => controller?.abort()}>Cancelar</Button>
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


