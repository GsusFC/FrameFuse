// Configuración de orígenes para la app web
function getEnv(key) {
    try {
        const meta = import.meta;
        if (meta && meta.env && meta.env[key]) {
            return String(meta.env[key]);
        }
    }
    catch { }
    try {
        if (typeof globalThis !== 'undefined' && globalThis[key]) {
            return String(globalThis[key]);
        }
    }
    catch { }
    return undefined;
}
function normalizeBase(urlLike) {
    try {
        const u = new URL(urlLike);
        return u.origin + (u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname);
    }
    catch {
        return urlLike.replace(/\/$/, '');
    }
}
const ENV_API_BASE = getEnv('FFZ_API_BASE') || getEnv('VITE_API_BASE') || getEnv('API_BASE');
export const API_BASE = ENV_API_BASE ? normalizeBase(ENV_API_BASE) : 'https://framefuse-rdmlsa0bx-gsus-projects.vercel.app/api';
//# sourceMappingURL=config.js.map