import { create } from 'zustand';
export const usePlayerStore = create((set) => ({
    currentMs: 0,
    setCurrentMs: (ms) => set({ currentMs: ms })
}));
//# sourceMappingURL=store.js.map