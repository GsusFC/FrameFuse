import { FFmpeg } from '@ffmpeg/ffmpeg';                    // ✅ Resuelto
import type { Timeline } from '@framefuse/core';             // ✅ Resuelto
import type { ExportOptions, VideoExporter } from '@framefuse/core'; // ✅ Resuelto
import type { FfmpegWorkerOptions } from '../types';        // ✅ Resuelto

/**
 * Mejoras clave frente a tu versión:
 * 1) Duraciones PRE-RECORTADAS cuando hay previewSeconds (y progresos exactos)
 * 2) Fallback automático a WebM/VP9 si libx264 no está disponible en ffmpeg.wasm
 * 3) Listeners de progreso/log sin fugas (un único listener global y contexto actual)
 * 4) Más mime/ext soportados (webp/avif/gif/bmp/svg). Fallback a re-encode PNG en navegador si hace falta
 * 5) Validaciones y mensajes de error más claros; limpieza robusta
 */

// ... existing code ...