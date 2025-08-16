export type ImageClip = {
    id: string;
    src: string;
    width: number;
    height: number;
    durationMs: number;
};
export type Timeline = {
    clips: ImageClip[];
};
export declare function createTimeline(initialClips?: ImageClip[]): Timeline;
export declare function reorderClips(timeline: Timeline, fromIndex: number, toIndex: number): Timeline;
export declare function updateClipDuration(timeline: Timeline, clipId: string, newDurationMs: number): Timeline;
export declare function computeTotalDurationMs(timeline: Timeline): number;
//# sourceMappingURL=timeline.d.ts.map