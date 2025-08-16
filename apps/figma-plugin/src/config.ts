// Centraliza la configuración de la app web para el plugin de Figma, parametrizable por variables de entorno

// Helpers seguros para leer variables de entorno en tiempo de build/ejecución
function getEnv(key: string): string | undefined {
  try {
    // Soporte opcional para import.meta.env (Vite u otros)
    const meta: any = (import.meta as any)
    if (meta && meta.env && meta.env[key]) {
      return String(meta.env[key])
    }
  } catch {}
  try {
    // Último recurso: variable global inyectada, si existiera
    if (typeof globalThis !== 'undefined' && (globalThis as any)[key]) {
      return String((globalThis as any)[key])
    }
  } catch {}
  return undefined
}

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin)
    // eliminar trailing slash para consistencia
    return url.origin
  } catch {
    // si no es una URL válida, devolver tal cual (evitar romper el build)
    return origin.replace(/\/$/, '')
  }
}

// Variables de entorno soportadas (en orden de prioridad):
// - FFZ_WEB_APP_ORIGIN, VITE_WEB_APP_ORIGIN, WEB_APP_ORIGIN
// - FFZ_API_BASE, VITE_API_BASE, API_BASE
const ENV_WEB_APP_ORIGIN = getEnv('FFZ_WEB_APP_ORIGIN') || getEnv('VITE_WEB_APP_ORIGIN') || getEnv('WEB_APP_ORIGIN')
const DEFAULT_WEB_APP_ORIGIN = 'https://frame-fuse-web.vercel.app'

export const WEB_APP_ORIGIN = normalizeOrigin(ENV_WEB_APP_ORIGIN || DEFAULT_WEB_APP_ORIGIN)

const ENV_API_BASE = getEnv('FFZ_API_BASE') || getEnv('VITE_API_BASE') || getEnv('API_BASE')
export const API_BASE = ENV_API_BASE ? ENV_API_BASE.replace(/\/$/, '') : `${WEB_APP_ORIGIN}/api`

export const getSlideshowUrl = (sessionId?: string) =>
  sessionId ? `${WEB_APP_ORIGIN}/slideshow?sessionId=${sessionId}` : WEB_APP_ORIGIN