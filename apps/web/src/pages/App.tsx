import * as React from 'react';
import { TimelinePanel } from '../features/timeline/TimelinePanel';
import { PreviewPanel } from '../features/preview/PreviewPanel';
import { ExportPanel } from '../features/export/ExportPanel';
import { useUploadStore } from '../features/upload/store';
import { Button } from '@framefuse/ui-kit';
import { ImportFFZ } from '../features/upload/ImportFFZ';
import { unzipSync, strFromU8 } from 'fflate';
import { API_BASE } from '../config';

function getQueryParam(name: string): string | null {
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get(name)
  } catch {
    return null
  }
}

function detectImageMime(data: Uint8Array): { mime: 'image/png' | 'image/jpeg'; ext: 'png' | 'jpeg' } {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  // JPEG signature: FF D8 ... FF D9 (we only check start)
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
    return { mime: 'image/jpeg', ext: 'jpeg' };
  }
  // Fallback to PNG
  return { mime: 'image/png', ext: 'png' };
}

async function fetchFFZBySession(sessionId: string): Promise<Uint8Array | null> {
  try {
    // Usar API_BASE centralizado; el endpoint maneja CORS
    // Descargar directamente el FFZ a través del API (proxy) para evitar CORS/COEP
    const ffzRes = await fetch(`${API_BASE}/session/${encodeURIComponent(sessionId)}?download=1`)
    if (!ffzRes.ok) throw new Error(`Blob download failed: ${ffzRes.status}`)
    const buf = new Uint8Array(await ffzRes.arrayBuffer())
    return buf
  } catch (e) {
    console.error('Auto-import session fetch failed:', e)
    return null
  }
}

export function App() {
  const hydrate = useUploadStore((s) => s.hydrate);
  const [timelineHeight, setTimelineHeight] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('framefuse:timelineHeight');
      return saved ? Number(saved) : 224;
    } catch {
      return 224;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('framefuse:timelineHeight', String(timelineHeight)); } catch {}
  }, [timelineHeight]);
  const startResizeRef = React.useRef<{ startY: number; startH: number } | null>(null);
  const onMouseDownHandle = (e: React.MouseEvent<HTMLDivElement>) => {
    startResizeRef.current = { startY: e.clientY, startH: timelineHeight };
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - (startResizeRef.current?.startY || 0);
      const next = Math.min(360, Math.max(140, (startResizeRef.current?.startH || 0) + delta));
      setTimelineHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      startResizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Export panel width (resizable)
  const [exportWidth, setExportWidth] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('framefuse:exportWidth');
      return saved ? Number(saved) : 384; // 24rem
    } catch {
      return 384;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem('framefuse:exportWidth', String(exportWidth)); } catch {}
  }, [exportWidth]);
  const startResizeXRef = React.useRef<{ startX: number; startW: number } | null>(null);
// Extracted generic resize handler factory for both axes
const createResizeHandler = (
  direction: 'horizontal' | 'vertical',
  currentValue: number,
  setValue: (val: number) => void,
  min: number,
  max: number
) => {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startVal = currentValue;

    const onMove = (ev: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? ev.clientX : ev.clientY;
      const delta = currentPos - startPos;
      const next = Math.min(max, Math.max(min, startVal + delta));
      setValue(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
};

// Replace the inline vertical resize handler with the generic factory
const onMouseDownVertical = createResizeHandler(
  'horizontal',    // axis of movement (X)
  exportWidth,     // starting width
  setExportWidth,  // state setter
  320,             // min width
  560              // max width
);
  
  const addClips = useUploadStore((s) => s.addClips);
const replaceClips = useUploadStore((s) => s.replaceClips);

  // Escuchar mensajes del plugin de Figma
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Seguridad: validar origen del mensaje, pero permitir mensajes del plugin (origin puede ser 'null')
      try {
        const origin = event.origin || ''
        const sameOrigin = origin === window.location.origin
        let isFigma = false
        if (origin) {
          try {
            const host = new URL(origin).hostname
            isFigma = host.endsWith('figma.com')
          } catch {}
        }
        const fromPlugin = !!(event.data?.source === 'figma-plugin' || event.data?.data?.source === 'figma-plugin')
        if (!(sameOrigin || isFigma || fromPlugin || origin === 'null' || origin === '')) {
          // Ignorar mensajes de orígenes no permitidos
          return
        }
      } catch {}

      // Verificar que el mensaje viene del plugin de Figma
      if (event.data?.type === 'figma-frames-import' && event.data?.images) {
        try {
          // Convertir las imágenes del plugin a archivos File
          const files = event.data.images.map((img: { name: string; data: number[] }) => {
            const uint8Array = new Uint8Array(img.data);
            const blob = new Blob([uint8Array], { type: 'image/png' });
            return new File([blob], `${img.name}.png`, { type: 'image/png' });
          });
          
          // Reemplazar los clips actuales para evitar mezclar con persistencia previa
          await replaceClips(files);
          
          // Enviar confirmación de vuelta al plugin
          if (event.source) {
            (event.source as Window).postMessage({
              type: 'figma-import-success',
              count: files.length
            }, '*');
          }
        } catch (error) {
          console.error('Error importando frames de Figma:', error);
          // Enviar error de vuelta al plugin
          if (event.source) {
            (event.source as Window).postMessage({
              type: 'figma-import-error',
              error: error instanceof Error ? error.message : 'Error desconocido'
            }, '*');
          }
        }
      }

      // Nuevo: recibir archivo FFZ comprimido directamente
      if (event.data?.type === 'figma-ffz-import') {
        try {
          const ffzArray: number[] | undefined = event.data?.data?.ffzData || event.data?.ffzData;
          if (!ffzArray || !Array.isArray(ffzArray)) throw new Error('FFZ data inválido');
          const ffzBuf = new Uint8Array(ffzArray);

          const unzipped = unzipSync(ffzBuf);

          // Buscar y parsear project.json (opcional)
          const projectJson = Object.keys(unzipped).find((k) => k.endsWith('project.json'));
          if (projectJson) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const project = JSON.parse(strFromU8(unzipped[projectJson]));
            } catch (e) {
              console.warn('No se pudo parsear project.json del FFZ:', e);
            }
          }

          // Extraer imágenes bajo images/
          const imageEntries = Object.keys(unzipped).filter((k) => k.startsWith('images/'));
          const files: File[] = imageEntries.map((name) => {
            const data = unzipped[name];
            const lower = name.toLowerCase();
            const ext = lower.endsWith('.png') ? 'png' : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'jpeg' : 'png';
            const fileName = name.split('/').pop() || 'img.png';
            // Copia defensiva del buffer
            const copy = new Uint8Array(data.byteLength);
            copy.set(data);
            return new File([copy.buffer], fileName, { type: `image/${ext}` });
          });

          if (files.length) await replaceClips(files);

          // Enviar confirmación
          if (event.source) {
            (event.source as Window).postMessage({
              type: 'figma-ffz-import-success',
              count: files.length
            }, '*');
          }
        } catch (error) {
          console.error('Error importando FFZ del plugin:', error);
          if (event.source) {
            (event.source as Window).postMessage({
              type: 'figma-ffz-import-error',
              error: error instanceof Error ? error.message : 'Error desconocido'
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addClips]);

  // Auto-import by sessionId in URL
  React.useEffect(() => {
    const sessionId = getQueryParam('sessionId')
    if (!sessionId) return
    let cancelled = false
    ;(async () => {
      const ffzBuf = await fetchFFZBySession(sessionId)
      if (!ffzBuf || cancelled) return
      try {
        const unzipped = unzipSync(ffzBuf)
        const imageEntries = Object.keys(unzipped).filter((k) => /\.(png|jpg|jpeg)$/i.test(k))
        const files: File[] = imageEntries.map((name) => {
          const data = unzipped[name]
          const sig = detectImageMime(data)
          const baseName = (name.split('/').pop() || 'img').replace(/\.(png|jpg|jpeg)$/i, '')
          const fileName = `${baseName}.${sig.ext}`
          const copy = new Uint8Array(data.byteLength)
          copy.set(data)
          return new File([copy], fileName, { type: sig.mime })
        })
        if (files.length) await replaceClips(files)
        // Optionally clean param
        try {
          const url = new URL(window.location.href)
          url.searchParams.delete('sessionId')
          window.history.replaceState({}, '', url.toString())
        } catch {}
      } catch (e) {
        console.error('Failed to import FFZ from session:', e)
      }
    })()
    return () => { cancelled = true }
  }, [replaceClips])

  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <div
      className="h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length) await addClips(files);
      }}
    >
      <header className="border-b border-[var(--border)] p-3 bg-[var(--panel)]">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">FrameFuse</div>
          <div className="flex items-center gap-2">
            <Button size="md" variant="accent" onClick={() => fileRef.current?.click()}>Añadir imágenes</Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length) await addClips(files);
              }}
            />
            <ImportFFZ />
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col p-3 gap-3 relative z-0">
        <div className="flex-1 min-h-0 flex gap-3">
          <section className="flex-1 min-h-0">
            <PreviewPanel />
          </section>
          {/* Vertical resizer between preview and export panel */}
          <div
            className="w-1 shrink-0 cursor-col-resize bg-[var(--panel)] border-x border-[var(--border)] rounded"
            title="Arrastra para ajustar el ancho del panel"
            onMouseDown={onMouseDownVertical}
          />
          <aside className="shrink-0 h-full min-h-0" style={{ width: exportWidth }}>
            <ExportPanel />
          </aside>
        </div>
        <div
          className="shrink-0 h-2 cursor-row-resize bg-[var(--panel)] border-t border-b border-[var(--border)] rounded"
          onMouseDown={onMouseDownHandle}
          title="Arrastra para ajustar la altura del timeline"
        />
        <section className="shrink-0" style={{ height: timelineHeight }}>
          <TimelinePanel />
        </section>
      </main>
    </div>
  );
}
