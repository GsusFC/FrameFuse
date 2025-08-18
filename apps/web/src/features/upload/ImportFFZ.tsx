import * as React from 'react';
import { useUploadStore } from './store';
import { Button } from '@framefuse/ui-kit';
import { unzipSync, strFromU8 } from 'fflate';

type FFZProject = {
  version: number;
  fps?: number;
  width?: number;
  height?: number;
  clips: Array<{
    id: string;
    filename: string;
    width: number;
    height: number;
    durationMs: number;
    transitionAfter?: { pluginId: string; durationMs: number };
  }>;
};

export function ImportFFZ() {
  const addClips = useUploadStore((s) => s.addClips);
  const setDuration = useUploadStore((s) => s.setDuration);
  const setTransitionAfter = useUploadStore((s) => s.setTransitionAfter);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleImport(file: File) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const unzipped = unzipSync(buf);
    const projectJson = Object.keys(unzipped).find((k) => k.endsWith('project.json'));
    if (!projectJson) throw new Error('project.json not found');
    const project = JSON.parse(strFromU8(unzipped[projectJson])) as FFZProject;
    const imageEntries = Object.keys(unzipped).filter((k) => k.startsWith('images/'));
    // Build File objects from buffers to reuse addClips
    const files: File[] = imageEntries.map((name) => {
      const data = unzipped[name];
      const { mime, ext } = detectImageMime(data);
      const baseName = (name.split('/').pop() || 'img').replace(/\.(png|jpg|jpeg)$/i, '');
      const fileName = `${baseName}.${ext}`;
      const copy = new Uint8Array(data.byteLength);
      copy.set(data);
      return new File([copy], fileName, { type: mime });
    });
    await addClips(files);
    // Map durations and transitions by filename
    for (const clip of project.clips) {
      // Find the matching added clip by src basename
      // This is heuristic; ideally we pass ids in project and map directly
      // Here we rely on order
      if (clip.durationMs) setDuration(clip.id, clip.durationMs);
      if (clip.transitionAfter) setTransitionAfter(clip.id, clip.transitionAfter);
    }

function detectImageMime(data: Uint8Array): { mime: 'image/png' | 'image/jpeg'; ext: 'png' | 'jpeg' } {
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
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
    return { mime: 'image/jpeg', ext: 'jpeg' };
  }
  return { mime: 'image/png', ext: 'png' };
}
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Importar .ffz</Button>
      <input ref={fileRef} type="file" accept=".ffz,.zip" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) await handleImport(f);
      }} />
    </div>
  );
}


