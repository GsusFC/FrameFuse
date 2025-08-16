import { describe, it, expect, vi } from 'vitest';
vi.mock('@ffmpeg/ffmpeg', () => {
  class FFmpegMock {
    loaded = false;
    async load() {
      this.loaded = true;
    }
  }
  return { FFmpeg: FFmpegMock };
});
import { createFfmpegWorkerExporter } from './createFfmpegWorkerExporter';

describe('createFfmpegWorkerExporter', () => {
  it('returns a VideoExporter with export method', async () => {
    const exporter = createFfmpegWorkerExporter();
    expect(exporter).toHaveProperty('export');
  });
});


