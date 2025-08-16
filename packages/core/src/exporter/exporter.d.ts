import type { Timeline } from '../timeline/timeline';
export type ExportFormat = 'webm' | 'mp4' | 'gif';
export type ExportOptions = {
    format: ExportFormat;
    fps: number;
    crf?: number;
};
export interface VideoExporter {
    export: (timeline: Timeline, options: ExportOptions) => Promise<Blob>;
}
//# sourceMappingURL=exporter.d.ts.map