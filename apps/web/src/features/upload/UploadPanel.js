import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { useUploadStore } from './store';
import { Button } from '@framefuse/ui-kit';
export function UploadPanel() {
    const inputRef = React.useRef(null);
    const addClips = useUploadStore((s) => s.addClips);
    return (_jsxs("div", { className: "border border-[var(--border)] rounded p-3 space-y-2 bg-[var(--surface)]", children: [_jsx("h2", { className: "font-semibold", children: "Im\u00E1genes" }), _jsx("div", { className: "border-2 border-dashed rounded p-6 text-center text-sm text-[var(--text-muted)] border-[var(--border)] bg-[var(--panel)]", onDragOver: (e) => e.preventDefault(), onDrop: async (e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                    if (files.length)
                        await addClips(files);
                }, children: "Arrastra y suelta im\u00E1genes aqu\u00ED" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => inputRef.current?.click(), children: "Seleccionar" }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: async (e) => {
                            const files = e.target.files ? Array.from(e.target.files) : [];
                            if (files.length)
                                await addClips(files);
                        } })] })] }));
}
//# sourceMappingURL=UploadPanel.js.map