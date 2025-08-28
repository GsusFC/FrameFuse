# 🦊 Despliegue de FrameFuse API en GitLab

## 📋 Requisitos Previos

1. **Cuenta GitLab** (gratis o premium)
2. **Proyecto GitLab** configurado
3. **GitLab Container Registry** habilitado

## 🚀 Pasos para Desplegar

### 1. Preparar el proyecto para GitLab

Asegúrate de que tienes todos los archivos necesarios:

```bash
# Verificar archivos requeridos
ls -la Dockerfile .gitlab-ci.yml api/ packages/
```

### 2. Configurar repositorio GitLab

```bash
# Agregar remote de GitLab (reemplaza con tu URL real)
git remote add gitlab https://gitlab.com/tu-usuario/tu-proyecto.git

# Hacer commit de todos los archivos necesarios
git add .
git commit -m "🚀 Configuración completa para despliegue en GitLab CI/CD

- 🐳 Dockerfile optimizado con FFmpeg y pnpm
- 🔄 Pipeline completo (.gitlab-ci.yml)
- 📦 API de renderizado con health checks
- 🏗️ Monorepo con packages locales
- 🧪 Tests automatizados incluidos"

# Pushear a GitLab
git push gitlab main
```

### 3. Configurar Variables de Entorno

En GitLab: **Settings > CI/CD > Variables**

```bash
# Variables requeridas para el pipeline
CI_REGISTRY_PASSWORD = [Tu token de acceso personal]
CI_REGISTRY_USER = [Tu usuario GitLab]
```

### 4. Habilitar GitLab Container Registry

En GitLab: **Settings > General > Visibility**
- ✅ Container Registry: **Enabled**

### 5. Verificar Pipeline

Después del push, el pipeline se ejecutará automáticamente:

1. Ve a **CI/CD > Pipelines**
2. Deberías ver un pipeline ejecutándose
3. Las etapas son: **Build → Test → Deploy**

#### 📊 Etapas del Pipeline:

- **🏗️ Build**: Construye imagen Docker y la sube al registry
- **🧪 Test**: Ejecuta tests y verifica compilación
- **🚀 Deploy**: Despliega a staging/producción (manual para main)
- **🧹 Cleanup**: Limpieza opcional de imágenes antiguas
- **📊 Report**: Genera reporte del pipeline

## 🌐 URLs y Endpoints

Después del despliegue exitoso:

### **URLs de Producción:**
- **🌐 API Base**: `http://[tu-servidor]:3000`
- **💚 Health Check**: `http://[tu-servidor]:3000/health`
- **🎬 Render Video**: `http://[tu-servidor]:3000/render`
- **📊 Container Registry**: `registry.gitlab.com/[tu-usuario]/[tu-proyecto]`

### **URLs de Staging:**
- **🌐 API Base**: `http://staging.[tu-servidor]:3000`
- **💚 Health Check**: `http://staging.[tu-servidor]:3000/health`

### **Monitoreo del Contenedor:**
```bash
# Ver logs del contenedor
docker logs framefuse-api

# Ver estado del contenedor
docker ps | grep framefuse

# Verificar health check
curl http://localhost:3000/health
```

### Despliegue del Contenedor

```bash
# Descargar imagen desde GitLab Container Registry
docker pull registry.gitlab.com/[tu-grupo]/[tu-proyecto]:latest

# Ejecutar contenedor
docker run -d \
  --name framefuse-api \
  -p 3000:3000 \
  registry.gitlab.com/[tu-grupo]/[tu-proyecto]:latest

# Verificar que esté corriendo
curl http://localhost:3000/health
```

## 💰 Costes Estimados

### Entendiendo los Costes de CI/CD

**Importante**: Los minutos de CI/CD se consumen por cada ejecución del pipeline (build/test/deploy), NO por el tiempo de renderizado en runtime.

#### Etapas típicas que consumen minutos de CI/CD:
- **Build**: Compilación del código y construcción de la imagen Docker
- **Test**: Ejecución de pruebas automatizadas
- **Deploy**: Push de la imagen al Container Registry
- **Cleanup**: Limpieza de recursos temporales

#### Ejemplo de cálculo mensual:
```
Minutos mensuales = (minutos por pipeline) × (ejecuciones por día) × (días por mes)
Ejemplo: 10 min/pipeline × 3 ejecuciones/día × 30 días = 900 minutos/mes
```

### Plan Gratuito (400 min/mes)
- ✅ **Desarrollo/Testing**: Perfecto
- ✅ **~13 ejecuciones diarias** (30 min cada una)
- 💡 **Recomendación**: Mide el tiempo real de tu pipeline para estimaciones precisas

### Plan Premium ($29/mes)
- ✅ **Producción**: 10,000 minutos
- ✅ **~333 ejecuciones diarias** (30 min cada una)
- 💡 **Recomendación**: Mide el tiempo real de tu pipeline para estimaciones precisas

#### Medición del tiempo de pipeline:
```bash
# Después de ejecutar el pipeline, verifica el tiempo total en:
# GitLab > CI/CD > Pipelines > [Tu pipeline] > Duration
```

## 🔧 Comandos Útiles

### Test local del Docker
```bash
# Build imagen
docker build -t framefuse-api .

# Ejecutar localmente
docker run -p 3000:3000 framefuse-api

# Test health
curl http://localhost:3000/health
```

### Debug de Pipeline
```bash
# Ver logs de GitLab CI
# GitLab > CI/CD > Pipelines > [Click en job]
```

## 🔒 Características de Seguridad

### **Usuario No-Root:**
- ✅ Ejecuta como usuario `framefuse` (UID 1001)
- ✅ Sin privilegios de administrador
- ✅ Mejor aislamiento de seguridad

### **Health Checks Integrados:**
- ✅ Verificación automática cada 30 segundos
- ✅ Timeout de 3 segundos por check
- ✅ 5 segundos de grace period al inicio
- ✅ Auto-restart en caso de fallos

### **Optimizaciones de Rendimiento:**
- ✅ Multi-stage build optimizado
- ✅ Cache inteligente de dependencias
- ✅ Imágenes base Alpine (ligeras)
- ✅ FFmpeg compilado estáticamente

## 🆘 Troubleshooting

### **Problemas del Pipeline:**

#### ❌ Pipeline falla en build
```bash
# Verificar archivos locales
ls -la Dockerfile .gitlab-ci.yml

# Verificar sintaxis del Dockerfile
docker build --dry-run .

# Revisar logs detallados en GitLab
# GitLab > CI/CD > Pipelines > [Pipeline] > Build Job > View Logs
```

#### ❌ Error de pnpm en CI
```bash
# Si falla la instalación de dependencias:
# 1. Verificar que pnpm-lock.yaml esté actualizado
pnpm install

# 2. Verificar versiones compatibles
node --version  # Debe ser Node 18+
pnpm --version   # Debe ser pnpm 8+
```

#### ❌ Tests fallan en CI
```bash
# Ejecutar tests localmente primero
pnpm test

# Verificar que todos los paquetes compilen
pnpm run build --filter=@framefuse/core
pnpm run build --filter=@framefuse/ffmpeg-worker
```

### **Problemas de FFmpeg:**

#### ❌ FFmpeg no encontrado
```bash
# Verificar instalación en contenedor
docker run --rm [tu-imagen] ffmpeg -version

# Si no está instalado, verificar Dockerfile
grep -n "ffmpeg" Dockerfile
```

#### ❌ Error de códecs MP4
```bash
# El pipeline incluye fallback automático a WebM
# Verificar logs del contenedor
docker logs [container-name] | grep -i "fallback\|webm"
```

### **Problemas de Health Check:**

#### ❌ Health check falla
```bash
# Verificar endpoint manualmente
curl http://localhost:3000/health

# Verificar que health.js existe
ls -la api/health.js

# Revisar logs del contenedor
docker logs [container-name] 2>&1 | tail -20
```

### **Problemas de Memoria/Tiempo:**

#### ❌ Timeouts en renderizado
```bash
# Aumentar timeout en .gitlab-ci.yml
# Buscar la línea de timeout y ajustar
grep -n "timeout" .gitlab-ci.yml
```

#### ❌ Memoria insuficiente
```bash
# Verificar uso de memoria del contenedor
docker stats [container-name]

# Ajustar límites en docker run
docker run --memory=2g --memory-swap=4g [tu-imagen]
```

### **Problemas de Red/Conectividad:**

#### ❌ No puede conectar al Container Registry
```bash
# Verificar credenciales
echo $CI_REGISTRY_USER
echo $CI_REGISTRY_PASSWORD | wc -c  # Debe ser > 0

# Probar login manual
docker login registry.gitlab.com
```

#### ❌ Error de pull/push de imagen
```bash
# Verificar que el registry esté habilitado
# GitLab > Settings > General > Visibility > Container Registry

# Verificar permisos del proyecto
# GitLab > Settings > Members
```

## 🤖 Integración con GitLab Duo (MCP)

### **¿Qué es MCP?**
El **Model Context Protocol** es un estándar abierto que conecta asistentes de IA con herramientas y fuentes de datos existentes.

### **Beneficios para FrameFuse:**

#### **🚀 IA en el Desarrollo:**
- **Análisis inteligente del pipeline** - GitLab Duo puede detectar cuellos de botella automáticamente
- **Optimizaciones de build** - Sugerencias para mejorar tiempos de compilación
- **Detección de vulnerabilidades** - Escaneo automático de seguridad en contenedores
- **Monitoreo de rendimiento** - Análisis de métricas de la API en tiempo real

#### **📊 Datos Contextuales:**
- **Métricas del pipeline** - Historial de builds y tiempos de ejecución
- **Información del registry** - Estado de imágenes Docker y vulnerabilidades
- **Logs de despliegue** - Análisis automático de errores y problemas
- **Rendimiento de la API** - Monitoreo de endpoints y tiempos de respuesta

#### **🔧 Automatización Inteligente:**
```bash
# GitLab Duo puede sugerir automáticamente:
✅ "Optimiza el cache de node_modules para reducir builds en 40%"
✅ "Usa Docker layer caching para builds más rápidos"
✅ "Actualiza FFmpeg a versión más reciente para mejor compatibilidad"
✅ "Implementa health checks más frecuentes para mejor estabilidad"
```

### **🛠️ Configuración MCP:**

#### **1. Habilitar GitLab Duo:**
```bash
# En tu proyecto GitLab:
Settings > GitLab Duo > Enable GitLab Duo features
```

#### **2. Configurar MCP Server:**
```bash
# Instalar dependencias MCP (opcional):
pnpm add @modelcontextprotocol/sdk

# Ejecutar MCP server localmente:
node scripts/framefuse-mcp-server.js
```

#### **3. Conectar con GitLab Duo:**
```bash
# En GitLab Duo Chat, menciona tu proyecto:
"Analiza el rendimiento del pipeline de FrameFuse"
"¿Cómo puedo optimizar el build de Docker?"
"Revisa vulnerabilidades en la imagen del registry"
```

## 🔧 GitLab CI/CD Inputs - Configuración Avanzada

### **¿Qué son los CI/CD Inputs?**
Los **inputs** son parámetros tipados y validados que permiten personalizar pipelines de CI/CD de manera segura y reutilizable.

### **Inputs Configurados en FrameFuse:**

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `environment` | string | `"production"` | Entorno de despliegue (development/staging/production) |
| `node_version` | string | `"18"` | Versión de Node.js (16/18/20) |
| `enable_mcp` | boolean | `true` | Habilitar GitLab Duo MCP |
| `docker_build_args` | string | `""` | Argumentos adicionales para Docker build |
| `registry_prefix` | string | `""` | Prefijo para el registry de Docker |
| `health_check_enabled` | boolean | `true` | Habilitar health checks automáticos |

### **Ejemplos de Uso:**

#### **1. Despliegue a Producción con Node.js 20:**
```yaml
include:
  - local: '.gitlab-ci.yml'
    inputs:
      environment: "production"
      node_version: "20"
      enable_mcp: true
```

#### **2. Despliegue a Staging sin MCP:**
```yaml
include:
  - local: '.gitlab-ci.yml'
    inputs:
      environment: "staging"
      enable_mcp: false
```

#### **3. Desarrollo con argumentos personalizados:**
```yaml
include:
  - local: '.gitlab-ci.yml'
    inputs:
      environment: "development"
      docker_build_args: "--build-arg BUILDKIT_INLINE_CACHE=1"
      registry_prefix: "dev-"
```

### **Ventajas de Usar Inputs:**

✅ **Validación automática** - Solo valores permitidos
✅ **Documentación integrada** - Descripciones claras
✅ **Reutilización** - Mismo pipeline, diferentes configuraciones
✅ **Type safety** - Evita errores de configuración
✅ **Seguridad** - Valores validados antes de ejecución

### **Cómo Usar en la Práctica:**

1. **Para desarrollo rápido:**
   ```yaml
   include:
     - local: '.gitlab-ci.yml'
       inputs:
         environment: "development"
         enable_mcp: false
   ```

2. **Para staging con monitoreo:**
   ```yaml
   include:
     - local: '.gitlab-ci.yml'
       inputs:
         environment: "staging"
         enable_mcp: true
   ```

3. **Para producción optimizada:**
   ```yaml
   include:
     - local: '.gitlab-ci.yml'
       inputs:
         environment: "production"
         node_version: "20"
         enable_mcp: true
   ```

## 📋 Checklist Final

### **Antes del Primer Despliegue:**

- [ ] Crear proyecto en GitLab
- [ ] Configurar Container Registry
- [ ] Agregar variables CI/CD (`CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`)
- [ ] Verificar que todos los archivos están en el repo:
  - [ ] `Dockerfile` ✅
  - [ ] `.gitlab-ci.yml` ✅
  - [ ] `api/` directory ✅
  - [ ] `packages/` directory ✅

### **Después del Push Inicial:**

- [ ] Verificar pipeline en **CI/CD > Pipelines**
- [ ] Revisar logs si hay errores
- [ ] Verificar imagen en Container Registry
- [ ] Probar despliegue local con la imagen

### **Próximos Pasos Recomendados:**

1. **🚀 Despliegue Inicial:**
   ```bash
   # Hacer el push inicial
   git add .
   git commit -m "feat: Configuración completa GitLab CI/CD"
   git push gitlab main
   ```

2. **🔍 Monitoreo:**
   - Configurar alertas en GitLab para fallos de pipeline
   - Revisar métricas de uso de CI/CD minutes

3. **📈 Optimización:**
   - Medir tiempos de build y ajustar cache
   - Considerar GitLab Premium si necesitas más minutos

4. **🔒 Seguridad:**
   - Rotar tokens de acceso regularmente
   - Configurar branch protection rules
   - Revisar permisos de Container Registry

## 🎯 ¡Listo para Desplegar!

Tu proyecto FrameFuse está completamente configurado para despliegue automático en GitLab. El pipeline se ejecutará automáticamente en cada push y mantendrá tu aplicación actualizada y segura.

**¿Necesitas ayuda con algún paso específico o tienes alguna pregunta sobre la configuración?**
