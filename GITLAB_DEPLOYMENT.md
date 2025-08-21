# 🦊 Despliegue de FrameFuse API en GitLab

## 📋 Requisitos Previos

1. **Cuenta GitLab** (gratis o premium)
2. **Proyecto GitLab** configurado
3. **GitLab Container Registry** habilitado

## 🚀 Pasos para Desplegar

### 1. Subir código a GitLab

```bash
# Clonar tu proyecto existente o crear uno nuevo
git remote add gitlab https://gitlab.com/gsusfc-group/GsusFC-project.git

# Pushear archivos de configuración
git add Dockerfile .gitlab-ci.yml api/
git commit -m "🦊 Configuración inicial para GitLab con FFmpeg"
git push gitlab main
```

### 2. Configurar Variables de Entorno

En GitLab: **Settings > CI/CD > Variables**

```
CI_REGISTRY_PASSWORD = [Token de acceso]
CI_REGISTRY_USER = [Tu usuario GitLab]
```

### 3. Habilitar GitLab Container Registry

En GitLab: **Settings > General > Visibility** 
- ✅ Container Registry: **Enabled**

### 4. Verificar Pipeline

1. Ve a **CI/CD > Pipelines**
2. Debería ejecutarse automáticamente al hacer push
3. Verificar que pase: Build → Test → Deploy

## 🌐 URLs Finales

Después del despliegue exitoso:

- **API Health**: `https://tu-proyecto.gitlab.io/health`
- **Render Endpoint**: `https://tu-proyecto.gitlab.io/render`

## 💰 Costes Estimados

### Plan Gratuito (400 min/mes)
- ✅ **Desarrollo/Testing**: Perfecto
- ✅ **~13 renderizados/día** (30 seg cada uno)

### Plan Premium ($29/mes)
- ✅ **Producción**: 10,000 minutos
- ✅ **~333 renderizados/día**

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

## ✅ Ventajas vs Vercel

- 🚀 **FFmpeg nativo** (más rápido)
- 💰 **Costes predecibles**
- 🐳 **Docker completo** (sin limitaciones)
- 🔧 **Más control** sobre el entorno
- 📊 **Mejor observabilidad**

## 🆘 Troubleshooting

### Pipeline falla en build
- Verificar que `Dockerfile` esté en la raíz
- Revisar logs en GitLab CI/CD

### FFmpeg no encontrado
- Verificar que la imagen base incluya FFmpeg
- Usar `apk add ffmpeg` en Alpine o `apt-get install ffmpeg` en Ubuntu

### Memory/Timeout issues
- Ajustar `timeout` en `.gitlab-ci.yml`
- Considerar usar GitLab Premium para más recursos
