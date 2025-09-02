import * as React from 'react';
import { useUploadStore } from '../upload/store';
import { Button } from '@framefuse/ui-kit';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
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
  const [openTransitionFor, setOpenTransitionFor] = React.useState<string | null>(null);
  const [copiedDurationId, setCopiedDurationId] = React.useState<string | null>(null);
  const [copiedTransitionForId, setCopiedTransitionForId] = React.useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = React.useState<null | { x: number; y: number; clipId: string }>(null);

  const totalMs = clips.reduce((s, c) => s + c.durationMs, 0);
  const currentMs = usePlayerStore((s) => s.currentMs);
  const progress = totalMs ? Math.min(1, currentMs / totalMs) : 0;

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        const isEditable =
          tag === 'input' || tag === 'select' || tag === 'textarea' || target.isContentEditable;
        if (isEditable) return;
      }
      if (e.key === 'c' || e.key === 'C') {
        copyDurationFrom(selectedIds[0]);
        e.preventDefault();
      } else if (e.key === 'v' || e.key === 'V') {
        pasteDurationToSelected();
        e.preventDefault();
      } else if (e.key === 't' || e.key === 'T') {
        if (e.shiftKey) {
          pasteTransitionToSelected();
        } else {
          copyTransitionFrom(selectedIds[0]);
        }
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Eliminar elementos seleccionados
        const ids = [...selectedIds];
        if (ids.length) {
          ids.forEach((id) => removeClip(id));
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const onWindowClick = () => setCtxMenu(null);
    window.addEventListener('click', onWindowClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onWindowClick);
    };
  }, [selectedIds, copyDurationFrom, pasteDurationToSelected, copyTransitionFrom, pasteTransitionToSelected]);

  return (
    <div className="border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full flex flex-col min-h-0 relative z-[1]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => clearClips()}>Limpiar</Button>
          {selectedIds.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">{selectedIds.length} seleccionadas</span>
          )}
          {(clipboardDurationMs || clipboardTransition) && (
            <span className="text-xs text-[var(--text-muted)]">
              {clipboardDurationMs ? `• Copiado: ${clipboardDurationMs}ms` : ''}
              {clipboardDurationMs && clipboardTransition ? ' · ' : ''}
              {clipboardTransition ? `Transición: ${mapTransitionLabel(clipboardTransition.pluginId)} ${clipboardTransition.durationMs}ms` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="h-1 w-full bg-[var(--panel)] rounded overflow-hidden">
        <div className="h-full bg-[var(--primary)]" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex-1 min-h-0">
      <DndContext
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            const oldIndex = clips.findIndex((c) => c.id === String(active.id));
            const newIndex = clips.findIndex((c) => c.id === String(over.id));
            if (oldIndex !== -1 && newIndex !== -1) reorder(oldIndex, newIndex);
          }
        }}
      >
        <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <ul className="flex gap-1 overflow-x-auto overflow-y-hidden max-w-full py-2 h-full items-center">
            {clips.map((c, idx) => (
              <React.Fragment key={c.id}>
                <SortableItem id={c.id} onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, clipId: c.id }); }}>
                  <li
                    className={`group relative border rounded p-2 bg-[var(--panel)] w-48 shrink-0 ${selectedIds.includes(c.id) ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'} ${copiedDurationId === c.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                    onPointerDown={(e) => {
                      const ev = e as unknown as React.MouseEvent;
                      if (ev.button === 2) { // botón derecho
                        ev.preventDefault();
                        setCtxMenu({ x: ev.clientX, y: ev.clientY, clipId: c.id });
                        return;
                      }
                      toggleSelect(c.id, ev.metaKey || ev.ctrlKey || ev.shiftKey);
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, clipId: c.id }); }}
                    onClick={(e) => toggleSelect(c.id, e.metaKey || e.ctrlKey || e.shiftKey)}
                    onDoubleClick={() => { copyDurationFrom(c.id); setCopiedDurationId(c.id); window.setTimeout(() => setCopiedDurationId(null), 1200);} }
                    aria-selected={selectedIds.includes(c.id)}
                  >
                    {/* Botón menú (hover) */}
                    <button
                      title="Acciones"
                      className="z-20 absolute top-1 left-1 h-6 w-6 rounded bg-[var(--surface)]/90 border border-[var(--border)] text-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, clipId: c.id }); }}
                    >
                      ⋯
                    </button>
                    <img src={c.src} alt="clip" className="h-28 w-full object-cover rounded" />
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                        <span>Duración</span>
                        <span className="text-[var(--text)]">{c.durationMs} ms · {(c.durationMs / 1000).toFixed(2)} s</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={3000}
                        step={50}
                        value={c.durationMs}
                        onChange={(e) => setDuration(c.id, Math.max(100, Number(e.target.value)))}
                        className="w-full accent-[var(--accent)]"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded border border-[var(--border)] text-[10px]"
                          onClick={() => setDuration(c.id, Math.max(100, c.durationMs - 50))}
                          aria-label="Restar 50 ms"
                        >
                          −50
                        </button>
                        <input
                          title="Duración (ms)"
                          type="number"
                          value={c.durationMs}
                          onChange={(e) => setDuration(c.id, Math.max(100, Number(e.target.value)))}
                          className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px]"
                          min={100}
                          step={50}
                        />
                        <button
                          className="px-2 py-1 rounded border border-[var(--border)] text-[10px]"
                          onClick={() => setDuration(c.id, Math.max(100, c.durationMs + 50))}
                          aria-label="Sumar 50 ms"
                        >
                          +50
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[200, 400, 600, 800, 1000].map((v) => (
                          <button
                            key={v}
                            className={`px-2 py-1 rounded border text-[10px] ${c.durationMs === v ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                            onClick={() => setDuration(c.id, v)}
                          >
                            {v} ms
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Eliminar clip"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#ef4444] text-white text-xs z-30"
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onClick={(e) => { e.stopPropagation(); removeClip(c.id); }}
                    >
                      ×
                    </button>
                  </li>
                </SortableItem>
                {idx < clips.length - 1 && (
                  <li className="shrink-0 h-full flex items-center justify-center relative list-none z-10 px-1">
                    <button
                      className={`px-2 py-1 rounded-full border text-xs ${clips[idx].transitionAfter ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'} ${copiedTransitionForId === c.id ? 'ring-1 ring-[var(--accent)]' : ''}`}
                      onClick={() => setOpenTransitionFor(openTransitionFor === c.id ? null : c.id)}
                      title="Transición"
                      aria-expanded={openTransitionFor === c.id}
                      onDoubleClick={() => { copyTransitionFrom(c.id); setCopiedTransitionForId(c.id); window.setTimeout(() => setCopiedTransitionForId(null), 1200);} }
                    >
                      {clips[idx].transitionAfter ? `${mapTransitionLabel(clips[idx].transitionAfter!.pluginId)} · ${clips[idx].transitionAfter!.durationMs}ms` : 'Corte'}
                    </button>
                  </li>
                )}
              </React.Fragment>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      </div>
      {/* Menú contextual por clip */}
      {ctxMenu && (() => {
        const clip = clips.find(cl => cl.id === ctxMenu.clipId);
        if (!clip) return null;
        const equalizeTo = clip.durationMs;
        const selCount = selectedIds.length || 1;
        return (
          <div className="fixed inset-0 z-[200]" onContextMenu={(e) => e.preventDefault()} onClick={() => setCtxMenu(null)}>
            <div
              className="absolute min-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] shadow-lg"
              style={{ top: Math.min(ctxMenu.y, window.innerHeight - 220), left: Math.min(ctxMenu.x, window.innerWidth - 240) }}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="py-1 text-sm">
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { copyDurationFrom(ctxMenu.clipId); setCopiedDurationId(ctxMenu.clipId); setCtxMenu(null); window.setTimeout(() => setCopiedDurationId(null), 1200); }}>
                    Copiar tiempo
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { equalizeSelected(equalizeTo); setCtxMenu(null); }}>
                    Igualar a este clip ({equalizeTo} ms)
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { distributeSelected(Math.max(600, selCount * 600)); setCtxMenu(null); }}>
                    Repartir (600 ms c/u)
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { pasteDurationToSelected(); setCtxMenu(null); }}>
                    Pegar tiempo a seleccionados
                  </button>
                </li>
                <li><hr className="my-1 border-[var(--border)]" /></li>
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { copyTransitionFrom(ctxMenu.clipId); setCopiedTransitionForId(ctxMenu.clipId); setCtxMenu(null); window.setTimeout(() => setCopiedTransitionForId(null), 1200); }}>
                    Copiar transición
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-3 py-2 hover:bg-[var(--panel)]" onClick={() => { pasteTransitionToSelected(); setCtxMenu(null); }}>
                    Pegar transición a seleccionados
                  </button>
                </li>
              </ul>
            </div>
          </div>
        );
      })()}
      {openTransitionFor && (() => {
        const i = clips.findIndex(x => x.id === openTransitionFor);
        if (i === -1 || i === clips.length - 1) return null;
        const tr = clips[i].transitionAfter;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true" onClick={() => setOpenTransitionFor(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative w-[min(90vw,520px)] max-h-[80vh] overflow-auto border border-[var(--border)] bg-[var(--surface)] rounded p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-semibold">Transición entre clips</div>
              <select
                className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-sm"
                value={tr?.pluginId ?? 'cut'}
                onChange={(e) => {
                  const pluginId = e.target.value;
                  if (pluginId === 'cut') setTransitionAfter(openTransitionFor, undefined);
                  else setTransitionAfter(openTransitionFor, { pluginId, durationMs: tr?.durationMs ?? 600 });
                }}
              >
                <option value="cut">Corte</option>
                <option value="crossfade">Crossfade</option>
                <option value="fade">Fade</option>
                <option value="fadeblack">Fade Black</option>
                <option value="fadewhite">Fade White</option>
                <option value="slide-right">Slide (→)</option>
                <option value="slide-left">Slide (←)</option>
                <option value="slide-up">Slide (↑)</option>
                <option value="slide-down">Slide (↓)</option>
                <option value="wipe-right">Wipe (→)</option>
                <option value="wipe-left">Wipe (←)</option>
                <option value="wipe-up">Wipe (↑)</option>
                <option value="wipe-down">Wipe (↓)</option>
                <option value="dissolve">Dissolve</option>
                <option value="pixelate">Pixelate</option>
                <option value="radial">Radial</option>
                <option value="circleopen">Circle Open</option>
                <option value="circleclose">Circle Close</option>
                <option value="zoomin">Zoom In</option>
                <option value="fadefast">Fade Fast</option>
                <option value="fadeslow">Fade Slow</option>
              </select>
              {clips[i].transitionAfter && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Duración</span>
                    <span className="text-[var(--text)]">{clips[i].transitionAfter!.durationMs} ms · {(clips[i].transitionAfter!.durationMs / 1000).toFixed(2)} s</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={1500}
                    step={50}
                    value={clips[i].transitionAfter!.durationMs}
                    onChange={(e) => setTransitionAfter(openTransitionFor, { ...clips[i].transitionAfter!, durationMs: Number(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[200,400,600,800,1000].map(v => (
                      <button
                        key={v}
                        className={`px-2 py-1 rounded border text-xs ${clips[i].transitionAfter!.durationMs===v ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                        onClick={() => setTransitionAfter(openTransitionFor!, { ...clips[i].transitionAfter!, durationMs: v })}
                      >
                        {v} ms
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm">
                <button className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => setOpenTransitionFor(null)}>Cerrar</button>
                {clips[i].transitionAfter && (
                  <button className="text-[#ef4444]" onClick={() => { setTransitionAfter(openTransitionFor, undefined); setOpenTransitionFor(null); }}>Quitar</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function SortableItem({ id, children, onContextMenu }: { id: string; children: React.ReactNode; onContextMenu?: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onContextMenu={onContextMenu}>
      {children}
    </div>
  );
}

function mapTransitionLabel(id: string): string {
  switch (id) {
    case 'crossfade':
      return 'XF';
    case 'fade':
      return 'FD';
    case 'fadeblack':
      return 'FB';
    case 'fadewhite':
      return 'FW';
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
    case 'radial':
      return 'RD';
    case 'circleopen':
      return 'CO';
    case 'circleclose':
      return 'CC';
    case 'zoomin':
      return 'ZI';
    case 'fadefast':
      return 'FF';
    case 'fadeslow':
      return 'FS';
    default:
      return 'CT';
  }
}
