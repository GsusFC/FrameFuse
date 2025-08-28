# 🐳 Dockerfile para FrameFuse API con FFmpeg
# Optimizado para GitLab CI/CD Pipeline
FROM node:18-alpine

# Instalar FFmpeg y dependencias necesarias
RUN apk add --no-cache \
    ffmpeg \
    pnpm \
    && rm -rf /var/cache/apk/*

# Crear directorio de trabajo
WORKDIR /app

# Configurar pnpm para CI
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copiar archivos de configuración del workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/
COPY packages/core/package.json ./packages/core/
COPY packages/ffmpeg-worker/package.json ./packages/ffmpeg-worker/
COPY packages/ui-kit/package.json ./packages/ui-kit/

# Instalar dependencias de producción
RUN pnpm install --frozen-lockfile --prod=false

# Copiar código fuente
COPY api/ ./api/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Construir paquetes locales
RUN pnpm run build --filter=@framefuse/core
RUN pnpm run build --filter=@framefuse/ffmpeg-worker

# Instalar dependencias del MCP server (opcional)
RUN pnpm add @modelcontextprotocol/sdk --save-optional

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S framefuse -u 1001

# Cambiar propietario de los archivos
RUN chown -R framefuse:nodejs /app
USER framefuse

# Health check mejorado
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node api/health.js || exit 1

# Exponer puertos
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "api/server.js"]
