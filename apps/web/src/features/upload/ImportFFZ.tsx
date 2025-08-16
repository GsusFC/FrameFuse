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
      const ext = name.toLowerCase().endsWith('.png') ? 'png' : name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png';
      const copy = new Uint8Array(data.byteLength);
      copy.set(data);
      return new File([copy.buffer], name.split('/').pop() || 'img.png', { type: `image/${ext}` });
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


