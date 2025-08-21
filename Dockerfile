# Dockerfile para FrameFuse API con FFmpeg
FROM node:18-alpine

# Instalar FFmpeg y dependencias necesarias
RUN apk add --no-cache \
    ffmpeg \
    sharp \
    && rm -rf /var/cache/apk/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY api/ ./api/
COPY packages/ ./packages/

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "api/server.js"]
