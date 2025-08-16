export function createTimeline(initialClips = []) {
    return { clips: [...initialClips] };
}
export function reorderClips(timeline, fromIndex, toIndex) {
    const next = [...timeline.clips];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return { clips: next };
}
export function updateClipDuration(timeline, clipId, newDurationMs) {
    const next = timeline.clips.map((c) => (c.id === clipId ? { ...c, durationMs: newDurationMs } : c));
    return { clips: next };
}
export function computeTotalDurationMs(timeline) {
    return timeline.clips.reduce((sum, c) => sum + c.durationMs, 0);
}
//# sourceMappingURL=timeline.js.map