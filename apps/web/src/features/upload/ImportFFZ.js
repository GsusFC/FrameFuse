import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useUploadStore } from './store';
import { Button } from '@framefuse/ui-kit';
import { unzipSync, strFromU8 } from 'fflate';
export function ImportFFZ() {
    const addClips = useUploadStore((s) => s.addClips);
    const setDuration = useUploadStore((s) => s.setDuration);
    const setTransitionAfter = useUploadStore((s) => s.setTransitionAfter);
    const fileRef = React.useRef(null);
    async function handleImport(file) {
        const buf = new Uint8Array(await file.arrayBuffer());
        const unzipped = unzipSync(buf);
        const projectJson = Object.keys(unzipped).find((k) => k.endsWith('project.json'));
        if (!projectJson)
            throw new Error('project.json not found');
        const project = JSON.parse(strFromU8(unzipped[projectJson]));
        const imageEntries = Object.keys(unzipped).filter((k) => k.startsWith('images/'));
        // Build File objects from buffers to reuse addClips
        const files = imageEntries.map((name) => {
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
            if (clip.durationMs)
                setDuration(clip.id, clip.durationMs);
            if (clip.transitionAfter)
                setTransitionAfter(clip.id, clip.transitionAfter);
        }
    }
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => fileRef.current?.click(), children: "Importar .ffz" }), _jsx("input", { ref: fileRef, type: "file", accept: ".ffz,.zip", className: "hidden", onChange: async (e) => {
                    const f = e.target.files?.[0];
                    if (f)
                        await handleImport(f);
                } })] }));
}
//# sourceMappingURL=ImportFFZ.js.map