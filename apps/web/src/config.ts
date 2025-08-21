// Configuración de orígenes para la app web

function getEnv(key: string): string | undefined {
  try {
    const meta: any = (import.meta as any)
    if (meta && meta.env && meta.env[key]) {
      return String(meta.env[key])
    }
  } catch {}
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any)[key]) {
      return String((globalThis as any)[key])
    }
  } catch {}
  return undefined
}

function normalizeBase(urlLike: string): string {
  try {
    const u = new URL(urlLike)
    return u.origin + (u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname)
  } catch {
    return urlLike.replace(/\/$/, '')
  }
}

const ENV_API_BASE = getEnv('FFZ_API_BASE') || getEnv('VITE_API_BASE') || getEnv('API_BASE')
export const API_BASE = ENV_API_BASE ? normalizeBase(ENV_API_BASE) : 'https://framefuse-rdmlsa0bx-gsus-projects.vercel.app/api'
