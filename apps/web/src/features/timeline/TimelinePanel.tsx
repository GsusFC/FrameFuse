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
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds, copyDurationFrom, pasteDurationToSelected, copyTransitionFrom, pasteTransitionToSelected]);

  return (
    <div className="border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)] h-full flex flex-col min-h-0 relative z-[1]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => clearClips()}>Limpiar</Button>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => copyDurationFrom()}>Copiar tiempo</Button>
              <Button size="sm" variant="outline" onClick={() => equalizeSelected(600)}>Igualar 600ms</Button>
              <Button size="sm" variant="outline" onClick={() => distributeSelected( selectedIds.length * 600 )}>Repartir</Button>
              <Button size="sm" variant="outline" onClick={() => pasteDurationToSelected()}>Pegar tiempo</Button>
              <Button size="sm" variant="outline" onClick={() => copyTransitionFrom()}>Copiar transición</Button>
              <Button size="sm" variant="outline" onClick={() => pasteTransitionToSelected()}>Pegar transición</Button>
              <span className="text-xs text-[var(--text-muted)]">{selectedIds.length} seleccionadas</span>
            </div>
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
                <SortableItem id={c.id}>
                  <li
                    className={`relative border rounded p-2 bg-[var(--panel)] w-48 shrink-0 ${selectedIds.includes(c.id) ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'} ${copiedDurationId === c.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                    onPointerDown={(e) => toggleSelect(c.id, e.metaKey || e.ctrlKey || e.shiftKey)}
                    onClick={(e) => toggleSelect(c.id, e.metaKey || e.ctrlKey || e.shiftKey)}
                    onDoubleClick={() => { copyDurationFrom(c.id); setCopiedDurationId(c.id); window.setTimeout(() => setCopiedDurationId(null), 1200);} }
                    aria-selected={selectedIds.includes(c.id)}
                  >
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
                      aria-label="Eliminar clip"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#ef4444] text-white text-xs"
                      onClick={() => removeClip(c.id)}
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

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
