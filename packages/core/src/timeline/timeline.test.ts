import { describe, it, expect } from 'vitest';
import { computeTotalDurationMs, createTimeline, reorderClips, updateClipDuration } from './timeline';

const clip = (id: string, durationMs: number) => ({ id, src: 'x', width: 1, height: 1, durationMs });

describe('timeline', () => {
  it('updates duration', () => {
    const t = createTimeline([clip('a', 100)]);
    const t2 = updateClipDuration(t, 'a', 200);
    expect(computeTotalDurationMs(t2)).toBe(200);
  });
  it('reorders clips', () => {
    const t = createTimeline([clip('a', 100), clip('b', 100), clip('c', 100)]);
    const t2 = reorderClips(t, 0, 2);
    expect(t2.clips.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});


