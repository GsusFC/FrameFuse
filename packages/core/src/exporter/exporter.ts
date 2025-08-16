import type { Timeline } from '../timeline/timeline';

export type ExportFormat = 'webm' | 'mp4' | 'gif';

export type ScaleMode = 'fit' | 'cover';

export type ExportOptions = {
  format: ExportFormat;
  fps: number;
  // Resolución de salida (opcional = mantener resolución original)
  width?: number;
  height?: number;
  scaleMode?: ScaleMode;

  // Calidad (mutuamente opcional)
  crf?: number; // 0-51 (x264/x265/vp9)
  bitrateKbps?: number; // alternativa a CRF
  speedPreset?: string; // ultrafast..placebo, o vp9 deadline good/best
  keyframeInterval?: number; // GOP size

  // GIF específicos
  gifColors?: number; // 2-256
  gifDither?: boolean; // legacy toggle (use gifDitherType when available)
  gifDitherType?: 'none' | 'bayer' | 'sierra2' | 'sierra2_4a' | 'floyd_steinberg';
  gifBayerScale?: number; // 1-5 when dither=bayer
  gifPaletteStatsMode?: 'full' | 'diff';
  gifReserveTransparency?: boolean;
  gifLoop?: boolean;

  // Nombre sugerido
  filename?: string;

  // Progreso y cancelación
  onProgress?: (progress01: number) => void;
  signal?: AbortSignal;

  // Preview/estimación
  previewSeconds?: number;
};

export interface VideoExporter {
  export: (timeline: Timeline, options: ExportOptions) => Promise<Blob>;
}


