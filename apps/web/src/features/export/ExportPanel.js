import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { Button } from '@framefuse/ui-kit';
// Lazy import para code-splitting y carga bajo demanda del worker/FFmpeg
export function ExportPanel() {
    const clips = useUploadStore((s) => s.clips);
    const [format, setFormat] = React.useState('webm');
    const [fps, setFps] = React.useState(30);
    const [preset, setPreset] = React.useState('balanced');
    const [width, setWidth] = React.useState(undefined);
    const [height, setHeight] = React.useState(undefined);
    const [scaleMode, setScaleMode] = React.useState('fit');
    const [crf, setCrf] = React.useState(23);
    const [bitrate, setBitrate] = React.useState(undefined);
    const [speedPreset, setSpeedPreset] = React.useState('medium');
    const [keyint, setKeyint] = React.useState(undefined);
    const [gifColors, setGifColors] = React.useState(256);
    const [gifDither, setGifDither] = React.useState(true);
    const [gifDitherType, setGifDitherType] = React.useState('sierra2_4a');
    const [gifBayerScale, setGifBayerScale] = React.useState(3);
    const [gifPaletteStatsMode, setGifPaletteStatsMode] = React.useState('full');
    const [gifReserveTransparency, setGifReserveTransparency] = React.useState(false);
    const [gifLoop, setGifLoop] = React.useState(true);
    const [filename, setFilename] = React.useState('export');
    const [previewSeconds, setPreviewSeconds] = React.useState(undefined);
    const [busy, setBusy] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [controller, setController] = React.useState(null);
    const [estBusy, setEstBusy] = React.useState(false);
    const [estProgress, setEstProgress] = React.useState(0);
    const [estSizeBytes, setEstSizeBytes] = React.useState(null);
    const [estSecondsUsed, setEstSecondsUsed] = React.useState(null);
    const [estController, setEstController] = React.useState(null);
    const [startTime, setStartTime] = React.useState(null);
    const elapsedSec = startTime ? (Date.now() - startTime) / 1000 : 0;
    const etaSec = progress > 0 ? Math.max(0, (elapsedSec / progress) * (1 - progress)) : null;
    const totalSec = Math.max(0.001, clips.reduce((s, c) => s + c.durationMs, 0) / 1000);
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    function applyPreset(nextPreset, f) {
        if (nextPreset === 'manual') {
            setPreset('manual');
            return;
        }
        setPreset(nextPreset);
        if (f === 'webm') {
            if (nextPreset === 'fast') {
                setCrf(34);
                setBitrate(undefined);
                setSpeedPreset('fast');
                setFps(30);
                setWidth(undefined);
                setHeight(undefined);
            }
            else if (nextPreset === 'balanced') {
                setCrf(30);
                setBitrate(undefined);
                setSpeedPreset('medium');
                setFps(30);
                setWidth(undefined);
                setHeight(undefined);
            }
            else {
                setCrf(24);
                setBitrate(undefined);
                setSpeedPreset('slow');
                setFps(30);
                setWidth(undefined);
                setHeight(undefined);
            }
        }
        else if (f === 'mp4') {
            if (nextPreset === 'fast') {
                setCrf(undefined);
                setBitrate(6000);
                setSpeedPreset('fast');
                setFps(30);
            }
            else if (nextPreset === 'balanced') {
                setCrf(23);
                setBitrate(undefined);
                setSpeedPreset('medium');
                setFps(30);
            }
            else {
                setCrf(20);
                setBitrate(undefined);
                setSpeedPreset('slow');
                setFps(30);
            }
        }
        else {
            if (nextPreset === 'fast') {
                setFps(12);
                setWidth(1280);
                setHeight(720);
                setScaleMode('fit');
                setGifColors(128);
                setGifDither(true);
                setGifDitherType('sierra2_4a');
                setGifPaletteStatsMode('full');
                setGifBayerScale(3);
            }
            else if (nextPreset === 'balanced') {
                setFps(15);
                setWidth(1920);
                setHeight(1080);
                setScaleMode('fit');
                setGifColors(128);
                setGifDither(true);
                setGifDitherType('sierra2_4a');
                setGifPaletteStatsMode('full');
                setGifBayerScale(3);
            }
            else {
                setFps(24);
                setWidth(1920);
                setHeight(1080);
                setScaleMode('fit');
                setGifColors(256);
                setGifDither(true);
                setGifDitherType('sierra2_4a');
                setGifPaletteStatsMode('full');
                setGifBayerScale(3);
            }
        }
    }
    const ensureManual = () => { if (preset !== 'manual')
        setPreset('manual'); };
    React.useEffect(() => {
        // Reaplicar valores del preset cuando cambie el formato
        applyPreset(preset, format);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [format]);
    return (_jsxs("div", { className: "border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full overflow-y-auto overflow-x-hidden", children: [_jsx("h2", { className: "font-semibold", children: "Exportar" }), _jsxs("div", { className: "flex flex-col gap-3 text-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx(Button, { size: "sm", variant: format === 'webm' ? 'accent' : 'outline', className: format === 'webm' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', "aria-pressed": format === 'webm', onClick: () => setFormat('webm'), children: "WebM" }), _jsx(Button, { size: "sm", variant: format === 'mp4' ? 'accent' : 'outline', className: format === 'mp4' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', "aria-pressed": format === 'mp4', onClick: () => setFormat('mp4'), children: "MP4" }), _jsx(Button, { size: "sm", variant: format === 'gif' ? 'accent' : 'outline', className: format === 'gif' ? 'ring-1 ring-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]', "aria-pressed": format === 'gif', onClick: () => setFormat('gif'), children: "GIF" }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "FPS" }), _jsx("input", { type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20", value: fps, onChange: (e) => setFps(Number(e.target.value)) })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx(Button, { size: "sm", variant: preset === 'fast' ? 'primary' : 'outline', className: preset === 'fast' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]', "aria-pressed": preset === 'fast', onClick: () => applyPreset('fast', format), children: "R\u00E1pido" }), _jsx(Button, { size: "sm", variant: preset === 'balanced' ? 'primary' : 'outline', className: preset === 'balanced' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]', "aria-pressed": preset === 'balanced', onClick: () => applyPreset('balanced', format), children: "Equilibrado" }), _jsx(Button, { size: "sm", variant: preset === 'quality' ? 'primary' : 'outline', className: preset === 'quality' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]', "aria-pressed": preset === 'quality', onClick: () => applyPreset('quality', format), children: "Calidad" }), _jsx(Button, { size: "sm", variant: preset === 'manual' ? 'primary' : 'outline', className: preset === 'manual' ? 'ring-1 ring-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)]', "aria-pressed": preset === 'manual', onClick: () => applyPreset('manual', format), children: "Manual" })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "Resoluci\u00F3n" }), _jsx("input", { placeholder: "auto", type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: width ?? '', onFocus: ensureManual, onChange: (e) => setWidth(e.target.value ? Number(e.target.value) : undefined) }), _jsx("span", { className: "text-[var(--text-muted)]", children: "x" }), _jsx("input", { placeholder: "auto", type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: height ?? '', onFocus: ensureManual, onChange: (e) => setHeight(e.target.value ? Number(e.target.value) : undefined) }), _jsxs("select", { className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1", value: scaleMode, onMouseDown: ensureManual, onChange: (e) => setScaleMode(e.target.value), children: [_jsx("option", { value: "fit", children: "Fit" }), _jsx("option", { value: "cover", children: "Cover" })] })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "Calidad" }), _jsx("input", { placeholder: "CRF", type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20", value: crf ?? '', onFocus: ensureManual, onChange: (e) => setCrf(e.target.value ? Number(e.target.value) : undefined) }), _jsx("span", { className: "text-[var(--text-muted)]", children: "o" }), _jsx("input", { placeholder: "kbps", type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: bitrate ?? '', onFocus: ensureManual, onChange: (e) => setBitrate(e.target.value ? Number(e.target.value) : undefined) }), _jsx("label", { className: "text-[var(--text-muted)]", children: "Preset" }), _jsx("select", { className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1", value: speedPreset, onMouseDown: ensureManual, onChange: (e) => setSpeedPreset(e.target.value), children: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].map(p => (_jsx("option", { value: p, children: p }, p))) }), _jsx("label", { className: "text-[var(--text-muted)]", children: "Keyint" }), _jsx("input", { placeholder: "auto", type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: keyint ?? '', onFocus: ensureManual, onChange: (e) => setKeyint(e.target.value ? Number(e.target.value) : undefined) })] }), format === 'gif' && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "GIF" }), _jsx("input", { type: "number", className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: gifColors, min: 2, max: 256, onFocus: ensureManual, onChange: (e) => setGifColors(Number(e.target.value)) }), _jsxs("label", { className: "flex items-center gap-2 text-[var(--text-muted)]", children: [_jsx("input", { type: "checkbox", checked: gifLoop, onChange: (e) => { ensureManual(); setGifLoop(e.target.checked); } }), " Loop"] })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "Dither" }), _jsxs("select", { className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1", value: gifDitherType, onMouseDown: ensureManual, onChange: (e) => { const v = e.target.value; setGifDitherType(v); setGifDither(v !== 'none'); }, children: [_jsx("option", { value: "none", children: "none" }), _jsx("option", { value: "bayer", children: "bayer" }), _jsx("option", { value: "sierra2", children: "sierra2" }), _jsx("option", { value: "sierra2_4a", children: "sierra2_4a" }), _jsx("option", { value: "floyd_steinberg", children: "floyd_steinberg" })] }), gifDitherType === 'bayer' && (_jsxs(_Fragment, { children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "bayer_scale" }), _jsx("input", { type: "number", min: 1, max: 5, className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-20", value: gifBayerScale, onChange: (e) => setGifBayerScale(Number(e.target.value)) })] })), _jsx("label", { className: "text-[var(--text-muted)]", children: "stats" }), _jsxs("select", { className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1", value: gifPaletteStatsMode, onChange: (e) => setGifPaletteStatsMode(e.target.value), children: [_jsx("option", { value: "full", children: "full" }), _jsx("option", { value: "diff", children: "diff" })] })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "Preview (s)" }), _jsx("input", { placeholder: "full", type: "number", min: 1, className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-24", value: previewSeconds ?? '', onChange: (e) => setPreviewSeconds(e.target.value ? Number(e.target.value) : undefined) }), _jsx("span", { className: "text-[var(--text-muted)]", children: "(export r\u00E1pido de prueba)" })] })] })), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-[var(--text-muted)]", children: "Nombre" }), _jsx("input", { className: "border border-[var(--border)] bg-[var(--panel)] rounded px-2 py-1 w-full", value: filename, onChange: (e) => setFilename(e.target.value) })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { disabled: !clips.length || busy, className: "rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm disabled:opacity-50", onClick: async () => {
                            setBusy(true);
                            setProgress(0);
                            setStartTime(Date.now());
                            const ctrl = new AbortController();
                            setController(ctrl);
                            try {
                                const { createFfmpegWorkerExporter } = await import('@framefuse/ffmpeg-worker');
                                const exporter = createFfmpegWorkerExporter();
                                const blob = await exporter.export({ clips }, {
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
                                    onProgress: (p) => setProgress(p),
                                    signal: ctrl.signal
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${filename || 'export'}.${format}`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }
                            catch (e) {
                                // Si se canceló, no hacer nada
                            }
                            finally {
                                setBusy(false);
                                setController(null);
                                setProgress(0);
                                setStartTime(null);
                            }
                        }, children: busy ? 'Exportando…' : 'Exportar' }), busy && (_jsx(Button, { variant: "outline", onClick: () => controller?.abort(), children: "Cancelar" }))] }), busy && (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "w-full h-2 rounded bg-[var(--panel)] border border-[var(--border)] overflow-hidden", children: _jsx("div", { className: "h-full bg-[var(--primary)] transition-[width]", style: { width: `${Math.round(progress * 100)}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-[var(--text-muted)]", children: [_jsxs("span", { children: [Math.round(progress * 100), "%"] }), _jsx("span", { children: etaSec !== null ? `~${Math.max(1, Math.round(etaSec))}s restantes` : '' })] })] })), format === 'gif' && (_jsxs("div", { className: "mt-2 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", disabled: !clips.length || estBusy, onClick: async () => {
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
                                        const blob = await exporter.export({ clips }, {
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
                                            onProgress: (p) => setEstProgress(p),
                                            signal: ctrl.signal
                                        });
                                        setEstSizeBytes(blob.size);
                                        setEstSecondsUsed(seconds);
                                    }
                                    catch { }
                                    finally {
                                        setEstBusy(false);
                                        setEstController(null);
                                        setEstProgress(0);
                                    }
                                }, children: "Estimar tama\u00F1o" }), estBusy && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => estController?.abort(), children: "Cancelar" }))] }), estSizeBytes !== null && estSecondsUsed !== null && (_jsxs("div", { className: "text-xs text-[var(--text-muted)]", children: [_jsxs("span", { children: ["Estimaci\u00F3n: ", _jsx("span", { className: "text-[var(--text)]", children: formatBytes(estSizeBytes) }), " para ", estSecondsUsed, "s"] }), _jsx("span", { className: "mx-2", children: "\u00B7" }), _jsxs("span", { children: ["Proyecci\u00F3n aprox.: ", _jsx("span", { className: "text-[var(--text)]", children: formatBytes(estSizeBytes * (totalSec / estSecondsUsed)) }), " para ", Math.round(totalSec), "s"] })] }))] }))] }));
}
//# sourceMappingURL=ExportPanel.js.map