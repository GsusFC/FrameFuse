export type ImageClip = {
  id: string;
  src: string; // object URL o data URL
  width: number;
  height: number;
  durationMs: number; // duración del clip en ms
  transitionAfter?: {
    pluginId: string; // 'cut' | 'crossfade' | 'fade' | 'slide-left' | ...
    durationMs: number;
    params?: Record<string, unknown>;
  };
};

export type Timeline = {
  clips: ImageClip[];
};

export function createTimeline(initialClips: ImageClip[] = []): Timeline {
  return { clips: [...initialClips] };
}

export function reorderClips(timeline: Timeline, fromIndex: number, toIndex: number): Timeline {
  const next = [...timeline.clips];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return { clips: next };
}

export function updateClipDuration(timeline: Timeline, clipId: string, newDurationMs: number): Timeline {
  const next = timeline.clips.map((c) => (c.id === clipId ? { ...c, durationMs: newDurationMs } : c));
  return { clips: next };
}

export function setClipTransition(
  timeline: Timeline,
  clipId: string,
  transition: ImageClip['transitionAfter'] | undefined
): Timeline {
  const next = timeline.clips.map((c) => (c.id === clipId ? { ...c, transitionAfter: transition } : c));
  return { clips: next };
}

export function computeTotalDurationMs(timeline: Timeline): number {
  return timeline.clips.reduce((sum, c) => sum + c.durationMs, 0);
}


