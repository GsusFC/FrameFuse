import { create } from 'zustand';
import type { ImageClip } from '@framefuse/core';
import { get as idbGet, set as idbSet } from 'idb-keyval';

type UploadState = {
  clips: ImageClip[];
  selectedIds: string[];
  clipboardDurationMs: number | null;
  clipboardTransition: ImageClip['transitionAfter'] | null;
  addClips: (files: File[]) => Promise<void>;
  setDuration: (id: string, durationMs: number) => void;
  reorder: (from: number, to: number) => void;
  removeClip: (id: string) => void;
  clearClips: () => void;
  setTransitionAfter: (
    id: string,
    transition: ImageClip['transitionAfter'] | undefined
  ) => void;
  // Selection
  toggleSelect: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  // Bulk ops
  equalizeSelected: (durationMs: number) => void;
  distributeSelected: (totalMs: number) => void;
  copyDurationFrom: (id?: string) => void;
  pasteDurationToSelected: () => void;
  copyTransitionFrom: (id?: string) => void;
  pasteTransitionToSelected: () => void;
  hydrate: () => Promise<void>;
};

export const useUploadStore = create<UploadState>((set, get) => ({
  clips: [],
  selectedIds: [],
  clipboardDurationMs: null,
  clipboardTransition: null,
  async addClips(files: File[]) {
    const newClips = await Promise.all(
      files.map(async (file) => {
        const id = crypto.randomUUID();
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        return {
          id,
          src: dataUrl,
          width: img.width,
          height: img.height,
          durationMs: 1000
        } satisfies ImageClip;
      })
    );
    const clips = [...get().clips, ...newClips];
    set({ clips });
    await persist(clips);
  },
  setDuration(id, durationMs) {
    const updated = get().clips.map((c) => (c.id === id ? { ...c, durationMs } : c));
    const clips = enforceConstraints(updated);
    set({ clips });
    void persist(clips);
  },
  reorder(from, to) {
    const next = [...get().clips];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    set({ clips: next });
    void persist(next);
  },
  removeClip(id) {
    const next = get().clips.filter((c) => c.id !== id);
    const selectedIds = get().selectedIds.filter((sid) => sid !== id);
    set({ clips: next, selectedIds });
    void persist(next);
  },
  clearClips() {
    set({ clips: [], selectedIds: [] });
    void persist([]);
  },
  setTransitionAfter(id, transition) {
    const base = get().clips.map((c) => (c.id === id ? { ...c, transitionAfter: transition } : c));
    const clips = enforceConstraints(base);
    set({ clips });
    void persist(clips);
  },
  toggleSelect(id, additive = false) {
    const { selectedIds } = get();
    let next: string[];
    if (additive) {
      next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
    } else {
      next = selectedIds.includes(id) && selectedIds.length === 1 ? [] : [id];
    }
    set({ selectedIds: next });
  },
  clearSelection() {
    set({ selectedIds: [] });
  },
  selectAll() {
    set({ selectedIds: get().clips.map((c) => c.id) });
  },
  equalizeSelected(durationMs) {
    const { selectedIds, clips } = get();
    if (!selectedIds.length) return;
    const updated = clips.map((c) => (selectedIds.includes(c.id) ? { ...c, durationMs } : c));
    const enforced = enforceConstraints(updated);
    set({ clips: enforced });
    void persist(enforced);
  },
  distributeSelected(totalMs) {
    const { selectedIds, clips } = get();
    if (!selectedIds.length) return;
    const per = Math.max(100, Math.floor(totalMs / selectedIds.length / 50) * 50);
    const updated = clips.map((c) => (selectedIds.includes(c.id) ? { ...c, durationMs: per } : c));
    const enforced = enforceConstraints(updated);
    set({ clips: enforced });
    void persist(enforced);
  },
  copyDurationFrom(id) {
    const { clips, selectedIds } = get();
    const pickId = id ?? selectedIds[0];
    const source = pickId ? clips.find((c) => c.id === pickId) : undefined;
    set({ clipboardDurationMs: source ? source.durationMs : null });
  },
  pasteDurationToSelected() {
    const { clipboardDurationMs } = get();
    if (!clipboardDurationMs) return;
    get().equalizeSelected(clipboardDurationMs);
  },
  copyTransitionFrom(id) {
    const { clips, selectedIds } = get();
    const pickId = id ?? selectedIds[0];
    const source = pickId ? clips.find((c) => c.id === pickId) : undefined;
    set({ clipboardTransition: source?.transitionAfter ?? null });
  },
  pasteTransitionToSelected() {
    const { clipboardTransition, selectedIds, clips } = get();
    if (!clipboardTransition) return;
    const lastIndex = clips.length - 1;
    const updated = clips.map((c, idx) =>
      selectedIds.includes(c.id) && idx !== lastIndex ? { ...c, transitionAfter: { ...clipboardTransition } } : c
    );
    const enforced = enforceConstraints(updated);
    set({ clips: enforced });
    void persist(enforced);
  },
  async hydrate() {
    const saved = (await idbGet(CLIPS_KEY)) as ImageClip[] | undefined;
    if (saved && Array.isArray(saved)) {
      set({ clips: saved });
    }
  }
}));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const CLIPS_KEY = 'framefuse:clips';

async function persist(clips: ImageClip[]): Promise<void> {
  await idbSet(CLIPS_KEY, clips);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function enforceConstraints(clips: ImageClip[]): ImageClip[] {
  // Asegura que duración >= duración de transición (si existe)
  return clips.map((c, idx) => {
    const tr = c.transitionAfter;
    if (tr && tr.durationMs > c.durationMs - 50) {
      // deja al menos 50 ms de contenido además de la transición
      return { ...c, durationMs: Math.max(tr.durationMs + 50, c.durationMs) };
    }
    return c;
  });
}


