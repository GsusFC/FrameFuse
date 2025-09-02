import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5174,
        strictPort: true,
        open: false
    },
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg']
    },
    worker: {
        format: 'es'
    },
    build: {
        rollupOptions: {
            external: [],
            output: {
                manualChunks: undefined
            }
        }
    }
});
//# sourceMappingURL=vite.config.js.map
