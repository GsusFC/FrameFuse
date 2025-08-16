import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { Button } from '@framefuse/ui-kit';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayerStore } from '../player/store';
export function TimelinePanel() {
    const clips = useUploadStore((s) => s.clips);
    const setDuration = useUploadStore((s) => s.setDuration);
    const reorder = useUploadStore((s) => s.reorder);
    const removeClip = useUploadStore((s) => s.removeClip);
    const clearClips = useUploadStore((s) => s.clearClips);
    const setTransitionAfter = useUploadStore((s) => s.setTransitionAfter);
    const selectedIds = useUploadStore((s) => s.selectedIds);
    const toggleSelect = useUploadStore((s) => s.toggleSelect);
    const equalizeSelected = useUploadStore((s) => s.equalizeSelected);
    const distributeSelected = useUploadStore((s) => s.distributeSelected);
    const pasteDurationToSelected = useUploadStore((s) => s.pasteDurationToSelected);
    const pasteTransitionToSelected = useUploadStore((s) => s.pasteTransitionToSelected);
    const copyDurationFrom = useUploadStore((s) => s.copyDurationFrom);
    const copyTransitionFrom = useUploadStore((s) => s.copyTransitionFrom);
    const clipboardDurationMs = useUploadStore((s) => s.clipboardDurationMs);
    const clipboardTransition = useUploadStore((s) => s.clipboardTransition);
    const [openTransitionFor, setOpenTransitionFor] = React.useState(null);
    const [copiedDurationId, setCopiedDurationId] = React.useState(null);
    const [copiedTransitionForId, setCopiedTransitionForId] = React.useState(null);
    const totalMs = clips.reduce((s, c) => s + c.durationMs, 0);
    const currentMs = usePlayerStore((s) => s.currentMs);
    const progress = totalMs ? Math.min(1, currentMs / totalMs) : 0;
    React.useEffect(() => {
        const onKeyDown = (e) => {
            const target = e.target;
            if (target) {
                const tag = target.tagName?.toLowerCase();
                const isEditable = tag === 'input' || tag === 'select' || tag === 'textarea' || target.isContentEditable;
                if (isEditable)
                    return;
            }
            if (e.key === 'c' || e.key === 'C') {
                copyDurationFrom(selectedIds[0]);
                e.preventDefault();
            }
            else if (e.key === 'v' || e.key === 'V') {
                pasteDurationToSelected();
                e.preventDefault();
            }
            else if (e.key === 't' || e.key === 'T') {
                if (e.shiftKey) {
                    pasteTransitionToSelected();
                }
                else {
                    copyTransitionFrom(selectedIds[0]);
                }
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedIds, copyDurationFrom, pasteDurationToSelected, copyTransitionFrom, pasteTransitionToSelected]);
    return (_jsxs("div", { className: "border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full flex flex-col min-h-0 relative z-[1]", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => clearClips(), children: "Limpiar" }), selectedIds.length > 0 && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => copyDurationFrom(), children: "Copiar tiempo" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => equalizeSelected(600), children: "Igualar 600ms" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => distributeSelected(selectedIds.length * 600), children: "Repartir" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => pasteDurationToSelected(), children: "Pegar tiempo" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => copyTransitionFrom(), children: "Copiar transici\u00F3n" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => pasteTransitionToSelected(), children: "Pegar transici\u00F3n" }), _jsxs("span", { className: "text-xs text-[var(--text-muted)]", children: [selectedIds.length, " seleccionadas"] })] })), (clipboardDurationMs || clipboardTransition) && (_jsxs("span", { className: "text-xs text-[var(--text-muted)]", children: [clipboardDurationMs ? `• Copiado: ${clipboardDurationMs}ms` : '', clipboardDurationMs && clipboardTransition ? ' · ' : '', clipboardTransition ? `Transición: ${mapTransitionLabel(clipboardTransition.pluginId)} ${clipboardTransition.durationMs}ms` : ''] }))] }) }), _jsx("div", { className: "h-1 w-full bg-[var(--panel)] rounded overflow-hidden", children: _jsx("div", { className: "h-full bg-[var(--primary)]", style: { width: `${progress * 100}%` } }) }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(DndContext, { onDragEnd: (event) => {
                        const { active, over } = event;
                        if (over && active.id !== over.id) {
                            const oldIndex = clips.findIndex((c) => c.id === String(active.id));
                            const newIndex = clips.findIndex((c) => c.id === String(over.id));
                            if (oldIndex !== -1 && newIndex !== -1)
                                reorder(oldIndex, newIndex);
                        }
                    }, children: _jsx(SortableContext, { items: clips.map((c) => c.id), strategy: horizontalListSortingStrategy, children: _jsx("ul", { className: "flex gap-1 overflow-x-auto overflow-y-hidden max-w-full py-2 h-full items-center", children: clips.map((c, idx) => (_jsxs(React.Fragment, { children: [_jsx(SortableItem, { id: c.id, children: _jsxs("li", { className: `relative border rounded p-2 bg-[var(--panel)] w-48 shrink-0 ${selectedIds.includes(c.id) ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'} ${copiedDurationId === c.id ? 'ring-2 ring-[var(--accent)]' : ''}`, onPointerDown: (e) => toggleSelect(c.id, e.metaKey || e.ctrlKey || e.shiftKey), onClick: (e) => toggleSelect(c.id, e.metaKey || e.ctrlKey || e.shiftKey), onDoubleClick: () => { copyDurationFrom(c.id); setCopiedDurationId(c.id); window.setTimeout(() => setCopiedDurationId(null), 1200); }, "aria-selected": selectedIds.includes(c.id), children: [_jsx("img", { src: c.src, alt: "clip", className: "h-28 w-full object-cover rounded" }), _jsxs("div", { className: "mt-2 space-y-1", children: [_jsxs("div", { className: "flex justify-between text-[10px] text-[var(--text-muted)]", children: [_jsx("span", { children: "Duraci\u00F3n" }), _jsxs("span", { className: "text-[var(--text)]", children: [c.durationMs, " ms \u00B7 ", (c.durationMs / 1000).toFixed(2), " s"] })] }), _jsx("input", { type: "range", min: 100, max: 3000, step: 50, value: c.durationMs, onChange: (e) => setDuration(c.id, Math.max(100, Number(e.target.value))), className: "w-full accent-[var(--accent)]" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { className: "px-2 py-1 rounded border border-[var(--border)] text-[10px]", onClick: () => setDuration(c.id, Math.max(100, c.durationMs - 50)), "aria-label": "Restar 50 ms", children: "\u221250" }), _jsx("input", { title: "Duraci\u00F3n (ms)", type: "number", value: c.durationMs, onChange: (e) => setDuration(c.id, Math.max(100, Number(e.target.value))), className: "w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]", min: 100, step: 50 }), _jsx("button", { className: "px-2 py-1 rounded border border-[var(--border)] text-[10px]", onClick: () => setDuration(c.id, Math.max(100, c.durationMs + 50)), "aria-label": "Sumar 50 ms", children: "+50" })] }), _jsx("div", { className: "flex flex-wrap gap-1", children: [200, 400, 600, 800, 1000].map((v) => (_jsxs("button", { className: `px-2 py-1 rounded border text-[10px] ${c.durationMs === v ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`, onClick: () => setDuration(c.id, v), children: [v, " ms"] }, v))) })] }), _jsx("button", { "aria-label": "Eliminar clip", className: "absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#ef4444] text-white text-xs", onClick: () => removeClip(c.id), children: "\u00D7" })] }) }), idx < clips.length - 1 && (_jsx("li", { className: "shrink-0 h-full flex items-center justify-center relative list-none z-10 px-1", children: _jsx("button", { className: `px-2 py-1 rounded-full border text-xs ${clips[idx].transitionAfter ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'} ${copiedTransitionForId === c.id ? 'ring-1 ring-[var(--accent)]' : ''}`, onClick: () => setOpenTransitionFor(openTransitionFor === c.id ? null : c.id), title: "Transici\u00F3n", "aria-expanded": openTransitionFor === c.id, onDoubleClick: () => { copyTransitionFrom(c.id); setCopiedTransitionForId(c.id); window.setTimeout(() => setCopiedTransitionForId(null), 1200); }, children: clips[idx].transitionAfter ? `${mapTransitionLabel(clips[idx].transitionAfter.pluginId)} · ${clips[idx].transitionAfter.durationMs}ms` : 'Corte' }) }))] }, c.id))) }) }) }) }), openTransitionFor && (() => {
                const i = clips.findIndex(x => x.id === openTransitionFor);
                if (i === -1 || i === clips.length - 1)
                    return null;
                const tr = clips[i].transitionAfter;
                return (_jsxs("div", { className: "fixed inset-0 z-[200] flex items-center justify-center", role: "dialog", "aria-modal": "true", onClick: () => setOpenTransitionFor(null), children: [_jsx("div", { className: "absolute inset-0 bg-black/50" }), _jsxs("div", { className: "relative w-[min(90vw,520px)] max-h-[80vh] overflow-auto border border-[var(--border)] bg-[var(--surface)] rounded p-4 space-y-3", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "text-sm font-semibold", children: "Transici\u00F3n entre clips" }), _jsxs("select", { className: "w-full rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-sm", value: tr?.pluginId ?? 'cut', onChange: (e) => {
                                        const pluginId = e.target.value;
                                        if (pluginId === 'cut')
                                            setTransitionAfter(openTransitionFor, undefined);
                                        else
                                            setTransitionAfter(openTransitionFor, { pluginId, durationMs: tr?.durationMs ?? 600 });
                                    }, children: [_jsx("option", { value: "cut", children: "Corte" }), _jsx("option", { value: "crossfade", children: "Crossfade" }), _jsx("option", { value: "fade", children: "Fade" }), _jsx("option", { value: "slide-right", children: "Slide (\u2192)" }), _jsx("option", { value: "slide-left", children: "Slide (\u2190)" }), _jsx("option", { value: "slide-up", children: "Slide (\u2191)" }), _jsx("option", { value: "slide-down", children: "Slide (\u2193)" }), _jsx("option", { value: "wipe-right", children: "Wipe (\u2192)" }), _jsx("option", { value: "wipe-left", children: "Wipe (\u2190)" }), _jsx("option", { value: "wipe-up", children: "Wipe (\u2191)" }), _jsx("option", { value: "wipe-down", children: "Wipe (\u2193)" }), _jsx("option", { value: "dissolve", children: "Dissolve" }), _jsx("option", { value: "pixelate", children: "Pixelate" })] }), clips[i].transitionAfter && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-[var(--text-muted)]", children: "Duraci\u00F3n" }), _jsxs("span", { className: "text-[var(--text)]", children: [clips[i].transitionAfter.durationMs, " ms \u00B7 ", (clips[i].transitionAfter.durationMs / 1000).toFixed(2), " s"] })] }), _jsx("input", { type: "range", min: 100, max: 1500, step: 50, value: clips[i].transitionAfter.durationMs, onChange: (e) => setTransitionAfter(openTransitionFor, { ...clips[i].transitionAfter, durationMs: Number(e.target.value) }), className: "w-full accent-[var(--accent)]" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [200, 400, 600, 800, 1000].map(v => (_jsxs("button", { className: `px-2 py-1 rounded border text-xs ${clips[i].transitionAfter.durationMs === v ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`, onClick: () => setTransitionAfter(openTransitionFor, { ...clips[i].transitionAfter, durationMs: v }), children: [v, " ms"] }, v))) })] })), _jsxs("div", { className: "flex justify-between pt-1 text-sm", children: [_jsx("button", { className: "text-[var(--text-muted)] hover:text-[var(--text)]", onClick: () => setOpenTransitionFor(null), children: "Cerrar" }), clips[i].transitionAfter && (_jsx("button", { className: "text-[#ef4444]", onClick: () => { setTransitionAfter(openTransitionFor, undefined); setOpenTransitionFor(null); }, children: "Quitar" }))] })] })] }));
            })()] }));
}
function SortableItem({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };
    return (_jsx("div", { ref: setNodeRef, style: style, ...attributes, ...listeners, children: children }));
}
function mapTransitionLabel(id) {
    switch (id) {
        case 'crossfade':
            return 'XF';
        case 'fade':
            return 'FD';
        case 'slide-right':
            return 'SL→';
        case 'slide-left':
            return 'SL←';
        case 'slide-up':
            return 'SL↑';
        case 'slide-down':
            return 'SL↓';
        case 'wipe-right':
            return 'WP→';
        case 'wipe-left':
            return 'WP←';
        case 'wipe-up':
            return 'WP↑';
        case 'wipe-down':
            return 'WP↓';
        case 'dissolve':
            return 'DS';
        case 'pixelate':
            return 'PX';
        default:
            return 'CT';
    }
}
//# sourceMappingURL=TimelinePanel.js.map