import * as React from 'react';
import { useUploadStore } from './store';
import { Button } from '@framefuse/ui-kit';

export function UploadPanel() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const addClips = useUploadStore((s) => s.addClips);

  return (
    <div className="border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)]">
      <h2 className="font-semibold">Imágenes</h2>
      <div
        className="border-2 border-dashed rounded p-6 text-center text-sm text-[var(--text-muted)] border-[var(--border)] bg-[var(--panel)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
          if (files.length) await addClips(files);
        }}
      >
        Arrastra y suelta imágenes aquí
      </div>
      <div className="flex gap-2">
        <Button onClick={() => inputRef.current?.click()}>Seleccionar</Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length) await addClips(files);
          }}
        />
      </div>
    </div>
  );
}


