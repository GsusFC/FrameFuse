import { create } from 'zustand';

type PlayerState = {
  currentMs: number;
  setCurrentMs: (ms: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentMs: 0,
  setCurrentMs: (ms) => set({ currentMs: ms })
}));


