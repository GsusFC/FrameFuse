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

// Asegura que el base no termine con '/api' para evitar duplicar '/api' en las rutas
function stripTrailingApi(urlLike: string): string {
  // Remove trailing /api or /api/ but preserve /api if it's part of the path
  return urlLike.replace(/\/api\/?$/, '')
}

const ENV_API_BASE = getEnv('FFZ_API_BASE') || getEnv('VITE_API_BASE') || getEnv('API_BASE')

// Detectar modo dev/prod de forma fiable en Vite
let viteDev = false
try { viteDev = Boolean((import.meta as any)?.env?.DEV) } catch {}
const isDevelopment = viteDev

// Base por defecto: en dev localhost, en prod dominio de Vercel (sin "/api")
const DEFAULT_API_BASE = isDevelopment
  ? 'http://localhost:3000'
  : (getEnv('DEFAULT_API_BASE') || 'https://framefuse-rdmlsa0bx-gsus-projects.vercel.app')

export const API_BASE = stripTrailingApi(ENV_API_BASE ? normalizeBase(ENV_API_BASE) : DEFAULT_API_BASE)

// Log para debugging (solo en desarrollo)
try {
  const devLog = Boolean((import.meta as any)?.env?.DEV)
  if (devLog) {
    console.log('🔧 FrameFuse Config:', {
      isDevelopment,
      API_BASE,
      NODE_ENV: getEnv('NODE_ENV'),
      DEV: getEnv('DEV'),
      VERCEL: getEnv('VERCEL')
    })
  }
} catch {}
