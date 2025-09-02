# Desarrollo local rápido

Este flujo levanta la API y la web en paralelo para probar exportaciones con transiciones.

## Requisitos

- Node 18+ (o 20+)
- pnpm 9+

## Arranque

1) Ejecuta el script de desarrollo local desde la raíz:

```bash
pnpm dev:local
```

Esto arrancará:

- API en `http://localhost:3000`
- Web (Vite) en `http://localhost:5174` apuntando a la API local

Variables opcionales:

```bash
API_PORT=4000 WEB_PORT=5180 pnpm dev:local
```

## Export con transiciones

En el panel de Export:

- “Opciones avanzadas” → puedes cambiar estrategia (`segments` recomendado), CRF, preset y activar `Debug`.
- El panel derecho es redimensionable: arrastra la barra vertical entre el preview y el panel.

## Notas

- Si tienes CORS en producción, usa `VITE_API_BASE` (sin `/api` al final) al construir/servir la web.
- Logs:
  - API: `/tmp/framefuse_api.log`
  - Web: `/tmp/framefuse_web.log`

