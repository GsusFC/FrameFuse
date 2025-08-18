import type { ImageClip } from '@framefuse/core';
type UploadState = {
    clips: ImageClip[];
    selectedIds: string[];
    clipboardDurationMs: number | null;
    clipboardTransition: ImageClip['transitionAfter'] | null;
    addClips: (files: File[]) => Promise<void>;
    replaceClips: (files: File[]) => Promise<void>;
    setDuration: (id: string, durationMs: number) => void;
    reorder: (from: number, to: number) => void;
    removeClip: (id: string) => void;
    clearClips: () => void;
    setTransitionAfter: (id: string, transition: ImageClip['transitionAfter'] | undefined) => void;
    toggleSelect: (id: string, additive?: boolean) => void;
    clearSelection: () => void;
    selectAll: () => void;
    equalizeSelected: (durationMs: number) => void;
    distributeSelected: (totalMs: number) => void;
    copyDurationFrom: (id?: string) => void;
    pasteDurationToSelected: () => void;
    copyTransitionFrom: (id?: string) => void;
    pasteTransitionToSelected: () => void;
    hydrate: () => Promise<void>;
};
export declare const useUploadStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UploadState>>;
export {};
//# sourceMappingURL=store.d.ts.map