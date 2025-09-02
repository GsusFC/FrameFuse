# Changelog

## v0.2.0 – Segment Export & UI Improvements

- API: Implement robust segment-based export pipeline
  - Replaces chained xfade with per-transition segments to match preview timing
  - Normalizes per-input framerate (looped images), sets SAR/PTS to prevent 1s collapse
  - Respects 'cut' as hard concat; quantizes durations/offsets to frame
  - Adds strategy flag (`segments` default, `xfade` optional), `crf`, `preset`, and `debug` options
  - Improves GIF quality using palettegen/paletteuse
- Web: Export panel and configuration
  - Adds “Opciones avanzadas” (CRF/bitrate/preset/keyint/strategy/debug) as a collapsible section
  - Makes the right sidebar resizable (width persisted in localStorage)
  - Centralizes `API_BASE` and strips trailing `/api`; fixes CORS base issues
- Web: Timeline UX
  - Per-card context menu (right-click or hover “⋯”) with time/transition actions
  - Keeps “Limpiar” in the toolbar; shows selection count; removes legacy bulk-action buttons
- Build/Deploy fixes
  - Removes stale compiled .js files that shadowed .tsx and caused 404s
  - Fixes TS imports (no `.tsx` suffix) for Vercel build
  - Resolves Vercel conflict by removing `api/health.js` and moving Docker health check to `scripts/health-check.js`

## v0.1.0 – Initial setup
- Monorepo scaffolding, preview, timeline, basic export.

