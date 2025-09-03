# Copilot Instructions for FrameFuse

## Project Architecture
- **Monorepo**: Contains multiple apps (`apps/figma-plugin`, `apps/web`), API (`api/`), and shared packages (`packages/core`, `packages/ui-kit`, `packages/ffmpeg-worker`).
- **API**: Express server in `api/server.js` and `api/server_backup.js` exposes `/render` and `/health` endpoints. Video rendering uses FFmpeg via child process, replicating preview logic from frontend.
- **Frontend**: `apps/web` (Vite + React) and `apps/figma-plugin` (Figma plugin, see its README for build/dev details).
- **Shared Logic**: Core video/timeline/export logic in `packages/core` and FFmpeg helpers in `packages/ffmpeg-worker`.

## Developer Workflows
- **Build**: Use `npm run build` or `npm run watch` in each app/package. Monorepo managed with `pnpm` (see `pnpm-workspace.yaml`).
- **API**: Start with `node api/server.js` or `node api/server_backup.js`. FFmpeg binary path is auto-detected or set via `FFMPEG_PATH` env var.
- **Web**: Start dev server in `apps/web` with `npm run dev`.
- **Figma Plugin**: Build and install as described in `apps/figma-plugin/README.md`.
- **Testing**: Uses `vitest` in packages (see `vitest.config.ts`).

## Conventions & Patterns
- **Video Rendering**: API replicates frontend preview logic exactly (see comments in `server_backup.js`).
- **Transitions**: Transition IDs mapped to FFmpeg xfade types (see `mapTransitionIdToXfade`).
- **Temporary Files**: API creates temp dirs for each render, cleans up after response/error.
- **Error Handling**: API returns JSON error responses with details; cleans up temp files on error.
- **CORS**: Open CORS policy for API endpoints.
- **Large Payloads**: API accepts large JSON bodies (50mb limit).

## Integration Points
- **FFmpeg**: Used via child process; path resolved from env or `@ffmpeg-installer/ffmpeg`.
- **Figma Plugin**: Exports frames/images, communicates with API for rendering.
- **Frontend ↔ API**: Web and plugin send project/clip data to `/render` endpoint for video generation.

## Key Files & Directories
- `api/server_backup.js`: Main API logic, rendering, error handling, conventions.
- `apps/web/src/`: Frontend React app.
- `apps/figma-plugin/`: Figma plugin source and build instructions.
- `packages/core/`: Core logic for timeline, transitions, exporter.
- `packages/ffmpeg-worker/`: FFmpeg helpers and types.

## Example: Render Workflow
1. Frontend/plugin sends POST to `/render` with project/clip data.
2. API validates, processes images, replicates preview timing, calls FFmpeg.
3. Output video/gif returned inline; temp files cleaned up.

---
For Figma plugin build/dev, see `apps/figma-plugin/README.md`.
For new packages/apps, follow monorepo structure and use pnpm for dependency management.
