import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { usePlayerStore } from '../player/store';
export function PreviewPanel() {
    const clips = useUploadStore((s) => s.clips);
    const canvasRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const imageCacheRef = React.useRef(new Map());
    const scratchRef = React.useRef(null);
    const ctxRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(true);
    const [fps] = React.useState(30);
    const setCurrentMs = usePlayerStore((s) => s.setCurrentMs);
    // Preload images into a cache to avoid creating Image() per frame
    React.useEffect(() => {
        const cache = imageCacheRef.current;
        const needed = new Set(clips.map((c) => c.src));
        // Add missing
        for (const src of needed) {
            if (!cache.has(src)) {
                const img = new Image();
                img.decoding = 'async';
                img.src = src;
                cache.set(src, img);
            }
        }
        // Remove stale
        for (const key of Array.from(cache.keys())) {
            if (!needed.has(key))
                cache.delete(key);
        }
    }, [clips]);
    React.useEffect(() => {
        let raf = 0;
        let last = performance.now();
        let elapsed = 0;
        // Cache 2D context with willReadFrequently to optimize getImageData readbacks
        if (!ctxRef.current && canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });
        }
        function frame(now) {
            const ctx = ctxRef.current;
            if (!ctx)
                return;
            const dt = now - last;
            last = now;
            elapsed += dt;
            const total = clips.reduce((sum, c) => sum + c.durationMs, 0) || 1;
            setCurrentMs(elapsed % total);
            const t = elapsed % total;
            let acc = 0;
            let currentIdx = 0;
            for (let i = 0; i < clips.length; i++) {
                const c = clips[i];
                if (t < acc + c.durationMs) {
                    currentIdx = i;
                    break;
                }
                acc += c.durationMs;
            }
            const current = clips[currentIdx];
            const canvas = canvasRef.current;
            const container = containerRef.current;
            const cw = container ? container.clientWidth : canvas.width || 1;
            const ch = container ? container.clientHeight : canvas.height || 1;
            canvas.width = cw;
            canvas.height = ch;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, cw, ch);
            if (current) {
                const localMs = t - acc;
                const tr = current.transitionAfter;
                const next = currentIdx < clips.length - 1 ? clips[currentIdx + 1] : undefined;
                const inTransition = tr && next && localMs >= Math.max(0, current.durationMs - tr.durationMs);
                const fitRect = (iw, ih) => {
                    const scale = Math.min(cw / iw, ch / ih);
                    const drawW = Math.max(1, Math.floor(iw * scale));
                    const drawH = Math.max(1, Math.floor(ih * scale));
                    const dx = Math.floor((cw - drawW) / 2);
                    const dy = Math.floor((ch - drawH) / 2);
                    return { drawW, drawH, dx, dy, scale };
                };
                const drawScaled = (img, iw, ih, alpha = 1) => {
                    const { drawW, drawH, dx, dy } = fitRect(iw, ih);
                    const prevAlpha = ctx.globalAlpha;
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(img, dx, dy, drawW, drawH);
                    ctx.globalAlpha = prevAlpha;
                };
                const drawPixelated = (img, iw, ih, pixel, alpha = 1) => {
                    const scale = Math.min(cw / iw, ch / ih);
                    const drawW = Math.max(1, Math.floor(iw * scale));
                    const drawH = Math.max(1, Math.floor(ih * scale));
                    const dx = Math.floor((cw - drawW) / 2);
                    const dy = Math.floor((ch - drawH) / 2);
                    const block = Math.max(1, Math.floor(pixel));
                    const sw = Math.max(1, Math.floor(drawW / block));
                    const sh = Math.max(1, Math.floor(drawH / block));
                    let scratch = scratchRef.current;
                    if (!scratch) {
                        scratch = document.createElement('canvas');
                        scratchRef.current = scratch;
                    }
                    scratch.width = sw;
                    scratch.height = sh;
                    const sctx = scratch.getContext('2d', { willReadFrequently: true });
                    if (!sctx)
                        return;
                    sctx.imageSmoothingEnabled = false;
                    sctx.clearRect(0, 0, sw, sh);
                    // Draw scaled down
                    sctx.drawImage(img, 0, 0, sw, sh);
                    // Draw back up to main
                    const prevAlpha = ctx.globalAlpha;
                    const prevSmooth = ctx.imageSmoothingEnabled;
                    ctx.imageSmoothingEnabled = false;
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(scratch, 0, 0, sw, sh, dx, dy, drawW, drawH);
                    ctx.globalAlpha = prevAlpha;
                    ctx.imageSmoothingEnabled = prevSmooth;
                };
                const drawSlide = (imgA, aW, aH, imgB, bW, bH, direction, t01) => {
                    const rA = fitRect(aW, aH);
                    const rB = fitRect(bW, bH);
                    // current (A) moves out, next (B) moves in
                    let ax = rA.dx, ay = rA.dy, bx = rB.dx, by = rB.dy;
                    if (direction === 'left') {
                        ax = rA.dx - Math.floor(t01 * rA.drawW);
                        bx = rB.dx + Math.floor((1 - t01) * rB.drawW);
                    }
                    else if (direction === 'right') {
                        ax = rA.dx + Math.floor(t01 * rA.drawW);
                        bx = rB.dx - Math.floor((1 - t01) * rB.drawW);
                    }
                    else if (direction === 'up') {
                        ay = rA.dy - Math.floor(t01 * rA.drawH);
                        by = rB.dy + Math.floor((1 - t01) * rB.drawH);
                    }
                    else if (direction === 'down') {
                        ay = rA.dy + Math.floor(t01 * rA.drawH);
                        by = rB.dy - Math.floor((1 - t01) * rB.drawH);
                    }
                    ctx.drawImage(imgA, ax, ay, rA.drawW, rA.drawH);
                    ctx.drawImage(imgB, bx, by, rB.drawW, rB.drawH);
                };
                const drawWipe = (imgA, aW, aH, imgB, bW, bH, direction, t01) => {
                    const rA = fitRect(aW, aH);
                    const rB = fitRect(bW, bH);
                    // Draw A full
                    ctx.drawImage(imgA, rA.dx, rA.dy, rA.drawW, rA.drawH);
                    // Clip and draw B
                    ctx.save();
                    if (direction === 'left') {
                        const w = Math.floor(rB.drawW * t01);
                        ctx.beginPath();
                        ctx.rect(rB.dx, rB.dy, w, rB.drawH);
                        ctx.clip();
                    }
                    else if (direction === 'right') {
                        const w = Math.floor(rB.drawW * t01);
                        ctx.beginPath();
                        ctx.rect(rB.dx + (rB.drawW - w), rB.dy, w, rB.drawH);
                        ctx.clip();
                    }
                    else if (direction === 'up') {
                        const h = Math.floor(rB.drawH * t01);
                        ctx.beginPath();
                        ctx.rect(rB.dx, rB.dy, rB.drawW, h);
                        ctx.clip();
                    }
                    else if (direction === 'down') {
                        const h = Math.floor(rB.drawH * t01);
                        ctx.beginPath();
                        ctx.rect(rB.dx, rB.dy + (rB.drawH - h), rB.drawW, h);
                        ctx.clip();
                    }
                    ctx.drawImage(imgB, rB.dx, rB.dy, rB.drawW, rB.drawH);
                    ctx.restore();
                };
                const cache = imageCacheRef.current;
                const imgA = cache.get(current.src);
                if (inTransition && next) {
                    const imgB = cache.get(next.src);
                    const start = current.durationMs - (tr?.durationMs ?? 0);
                    const tt = tr?.durationMs ? (localMs - start) / tr.durationMs : 0;
                    const t01 = Math.max(0, Math.min(1, tt));
                    if (imgA && imgB) {
                        if (tr?.pluginId === 'pixelate') {
                            const maxPx = 24;
                            const pOut = 1 + t01 * maxPx;
                            const pIn = 1 + (1 - t01) * maxPx;
                            drawPixelated(imgA, current.width, current.height, pOut, 1 - t01 * 0.2);
                            drawPixelated(imgB, next.width, next.height, pIn, 0.8 * t01 + 0.2);
                        }
                        else if (tr?.pluginId?.startsWith('slide-')) {
                            const dir = tr.pluginId.replace('slide-', '');
                            drawSlide(imgA, current.width, current.height, imgB, next.width, next.height, dir, t01);
                        }
                        else if (tr?.pluginId?.startsWith('wipe-')) {
                            const dir = tr.pluginId.replace('wipe-', '');
                            drawWipe(imgA, current.width, current.height, imgB, next.width, next.height, dir, t01);
                        }
                        else {
                            drawScaled(imgA, current.width, current.height, 1 - t01);
                            drawScaled(imgB, next.width, next.height, t01);
                        }
                    }
                    else if (imgA) {
                        drawScaled(imgA, current.width, current.height, 1);
                    }
                }
                else {
                    if (imgA) {
                        drawScaled(imgA, current.width, current.height, 1);
                    }
                }
            }
            if (isPlaying)
                raf = requestAnimationFrame(frame);
        }
        if (isPlaying)
            raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [clips, isPlaying, fps, setCurrentMs]);
    return (_jsxs("div", { className: "border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full flex flex-col min-h-0 relative z-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-semibold", children: "Preview" }), _jsx("div", { className: "flex items-center gap-2", children: _jsx("button", { className: "rounded-md px-3 py-2 text-sm font-semibold bg-[#ef4444] text-white shadow-sm hover:opacity-90", onClick: () => setIsPlaying((v) => !v), children: isPlaying ? 'Pausar' : 'Reproducir' }) })] }), _jsx("div", { ref: containerRef, className: "flex-1 min-h-0 overflow-hidden bg-black rounded", children: _jsx("canvas", { ref: canvasRef, className: "w-full h-full block" }) })] }));
}
//# sourceMappingURL=PreviewPanel.js.map