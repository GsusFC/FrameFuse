import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { TimelinePanel } from '../features/timeline/TimelinePanel';
import { PreviewPanel } from '../features/preview/PreviewPanel';
import { ExportPanel } from '../features/export/ExportPanel';
import { useUploadStore } from '../features/upload/store';
import { Button } from '@framefuse/ui-kit';
import { ImportFFZ } from '../features/upload/ImportFFZ';
import { unzipSync, strFromU8 } from 'fflate';
function getQueryParam(name) {
    try {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }
    catch {
        return null;
    }
}
async function fetchFFZBySession(sessionId) {
    try {
        // Intento 1: mismo origen (útil en producción o si existe proxy local)
        const base = window.location.origin;
        let res = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
            // Intento 2: fallback a origen de producción si estamos en localhost o si el primer intento falla
            const prodOrigin = 'https://frame-fuse-web.vercel.app';
            try {
                res = await fetch(`${prodOrigin}/api/session/${encodeURIComponent(sessionId)}`);
            }
            catch (e) {
                throw new Error(`Session fetch failed: ${res.status}`);
            }
        }
        const data = (await res.json());
        if (!data.blobUrl)
            return null;
        const ffzRes = await fetch(data.blobUrl);
        if (!ffzRes.ok)
            throw new Error(`Blob download failed: ${ffzRes.status}`);
        const buf = new Uint8Array(await ffzRes.arrayBuffer());
        return buf;
    }
    catch (e) {
        console.error('Auto-import session fetch failed:', e);
        return null;
    }
}
export function App() {
    const hydrate = useUploadStore((s) => s.hydrate);
    const [timelineHeight, setTimelineHeight] = React.useState(() => {
        try {
            const saved = localStorage.getItem('framefuse:timelineHeight');
            return saved ? Number(saved) : 224;
        }
        catch {
            return 224;
        }
    });
    React.useEffect(() => {
        try {
            localStorage.setItem('framefuse:timelineHeight', String(timelineHeight));
        }
        catch { }
    }, [timelineHeight]);
    const startResizeRef = React.useRef(null);
    const onMouseDownHandle = (e) => {
        startResizeRef.current = { startY: e.clientY, startH: timelineHeight };
        const onMove = (ev) => {
            const delta = ev.clientY - (startResizeRef.current?.startY || 0);
            const next = Math.min(360, Math.max(140, (startResizeRef.current?.startH || 0) + delta));
            setTimelineHeight(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            startResizeRef.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    React.useEffect(() => {
        void hydrate();
    }, [hydrate]);
    const addClips = useUploadStore((s) => s.addClips);
    // Escuchar mensajes del plugin de Figma
    React.useEffect(() => {
        const handleMessage = async (event) => {
            // Verificar que el mensaje viene del plugin de Figma
            if (event.data?.type === 'figma-frames-import' && event.data?.images) {
                try {
                    // Convertir las imágenes del plugin a archivos File
                    const files = event.data.images.map((img) => {
                        const uint8Array = new Uint8Array(img.data);
                        const blob = new Blob([uint8Array], { type: 'image/png' });
                        return new File([blob], `${img.name}.png`, { type: 'image/png' });
                    });
                    // Agregar los archivos al store
                    await addClips(files);
                    // Enviar confirmación de vuelta al plugin
                    if (event.source) {
                        event.source.postMessage({
                            type: 'figma-import-success',
                            count: files.length
                        }, '*');
                    }
                }
                catch (error) {
                    console.error('Error importando frames de Figma:', error);
                    // Enviar error de vuelta al plugin
                    if (event.source) {
                        event.source.postMessage({
                            type: 'figma-import-error',
                            error: error instanceof Error ? error.message : 'Error desconocido'
                        }, '*');
                    }
                }
            }
            // Nuevo: recibir archivo FFZ comprimido directamente
            if (event.data?.type === 'figma-ffz-import') {
                try {
                    const ffzArray = event.data?.data?.ffzData || event.data?.ffzData;
                    if (!ffzArray || !Array.isArray(ffzArray))
                        throw new Error('FFZ data inválido');
                    const ffzBuf = new Uint8Array(ffzArray);
                    const unzipped = unzipSync(ffzBuf);
                    // Buscar y parsear project.json (opcional)
                    const projectJson = Object.keys(unzipped).find((k) => k.endsWith('project.json'));
                    if (projectJson) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const project = JSON.parse(strFromU8(unzipped[projectJson]));
                        }
                        catch (e) {
                            console.warn('No se pudo parsear project.json del FFZ:', e);
                        }
                    }
                    // Extraer imágenes bajo images/
                    const imageEntries = Object.keys(unzipped).filter((k) => k.startsWith('images/'));
                    const files = imageEntries.map((name) => {
                        const data = unzipped[name];
                        const lower = name.toLowerCase();
                        const ext = lower.endsWith('.png') ? 'png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'jpeg' : 'png';
                        const fileName = name.split('/').pop() || 'img.png';
                        // Copia defensiva del buffer
                        const copy = new Uint8Array(data.byteLength);
                        copy.set(data);
                        return new File([copy.buffer], fileName, { type: `image/${ext}` });
                    });
                    if (files.length)
                        await addClips(files);
                    // Enviar confirmación
                    if (event.source) {
                        event.source.postMessage({
                            type: 'figma-ffz-import-success',
                            count: files.length
                        }, '*');
                    }
                }
                catch (error) {
                    console.error('Error importando FFZ del plugin:', error);
                    if (event.source) {
                        event.source.postMessage({
                            type: 'figma-ffz-import-error',
                            error: error instanceof Error ? error.message : 'Error desconocido'
                        }, '*');
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addClips]);
    // Auto-import by sessionId in URL
    React.useEffect(() => {
        const sessionId = getQueryParam('sessionId');
        if (!sessionId)
            return;
        let cancelled = false;
        (async () => {
            const ffzBuf = await fetchFFZBySession(sessionId);
            if (!ffzBuf || cancelled)
                return;
            try {
                const unzipped = unzipSync(ffzBuf);
                const imageEntries = Object.keys(unzipped).filter((k) => k.startsWith('images/'));
                const files = imageEntries.map((name) => {
                    const data = unzipped[name];
                    const lower = name.toLowerCase();
                    const ext = lower.endsWith('.png') ? 'png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'jpeg' : 'png';
                    const fileName = name.split('/').pop() || 'img.png';
                    const copy = new Uint8Array(data.byteLength);
                    copy.set(data);
                    return new File([copy.buffer], fileName, { type: `image/${ext}` });
                });
                if (files.length)
                    await addClips(files);
                // Optionally clean param
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('sessionId');
                    window.history.replaceState({}, '', url.toString());
                }
                catch { }
            }
            catch (e) {
                console.error('Failed to import FFZ from session:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [addClips]);
    const fileRef = React.useRef(null);
    return (_jsxs("div", { className: "h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]", onDragOver: (e) => e.preventDefault(), onDrop: async (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
            if (files.length)
                await addClips(files);
        }, children: [_jsx("header", { className: "border-b border-[var(--border)] p-3 bg-[var(--panel)]", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-lg font-semibold", children: "FrameFuse" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "md", variant: "accent", onClick: () => fileRef.current?.click(), children: "A\u00F1adir im\u00E1genes" }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: async (e) => {
                                        const files = e.target.files ? Array.from(e.target.files) : [];
                                        if (files.length)
                                            await addClips(files);
                                    } }), _jsx(ImportFFZ, {})] })] }) }), _jsxs("main", { className: "flex-1 min-h-0 flex flex-col p-3 gap-3 relative z-0", children: [_jsxs("div", { className: "flex-1 min-h-0 flex gap-3", children: [_jsx("section", { className: "flex-1 min-h-0", children: _jsx(PreviewPanel, {}) }), _jsx("aside", { className: "w-80 shrink-0 h-full min-h-0", children: _jsx(ExportPanel, {}) })] }), _jsx("div", { className: "shrink-0 h-2 cursor-row-resize bg-[var(--panel)] border-t border-b border-[var(--border)] rounded", onMouseDown: onMouseDownHandle, title: "Arrastra para ajustar la altura del timeline" }), _jsx("section", { className: "shrink-0", style: { height: timelineHeight }, children: _jsx(TimelinePanel, {}) })] })] }));
}
//# sourceMappingURL=App.js.map