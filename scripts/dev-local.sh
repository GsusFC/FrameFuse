#!/usr/bin/env bash
set -euo pipefail

# Simple local dev runner for FrameFuse
# - Starts API on :3000
# - Starts Vite on :5174 pointing to API

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT=${API_PORT:-3000}
WEB_PORT=${WEB_PORT:-5174}

echo "[dev-local] Starting API on :$API_PORT"
PORT="$API_PORT" node api/server.js > /tmp/framefuse_api.log 2>&1 &
API_PID=$!

cleanup() {
  echo "\n[dev-local] Cleaning up..."
  if kill -0 "$API_PID" >/dev/null 2>&1; then kill "$API_PID" 2>/dev/null || true; fi
  if [ -n "${WEB_PID:-}" ] && kill -0 "$WEB_PID" >/dev/null 2>&1; then kill "$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

sleep 1
echo "[dev-local] API logs: tail -f /tmp/framefuse_api.log"

echo "[dev-local] Starting Web on :$WEB_PORT (API_BASE=http://localhost:$API_PORT)"
VITE_API_BASE="http://localhost:$API_PORT" pnpm --dir apps/web dev -- --port "$WEB_PORT" --strictPort > /tmp/framefuse_web.log 2>&1 &
WEB_PID=$!

sleep 1
echo "[dev-local] Web logs: tail -f /tmp/framefuse_web.log"
echo "[dev-local] Visit: http://localhost:$WEB_PORT"

# Wait on both; keep process alive
wait "$WEB_PID"

