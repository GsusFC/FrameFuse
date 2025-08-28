# 🤖 FrameFuse MCP Server

Servidor MCP (Model Context Protocol) para integrar GitLab Duo con el pipeline CI/CD de FrameFuse.

## 📋 ¿Qué es MCP?

El **Model Context Protocol** es un estándar abierto que permite conectar asistentes de IA con herramientas y fuentes de datos existentes. Con MCP, GitLab Duo puede acceder a datos contextuales específicos de tu proyecto para proporcionar asistencia más inteligente.

## 🚀 Características

### **Herramientas Disponibles:**

1. **`analyze_pipeline_performance`** - Analiza el rendimiento del pipeline y sugiere optimizaciones
2. **`check_ffmpeg_compatibility`** - Verifica compatibilidad de FFmpeg en diferentes plataformas
3. **`optimize_build_cache`** - Optimiza estrategias de cache para builds más rápidos

### **Recursos Disponibles:**

- **`framefuse://gitlab/pipeline-data`** - Datos históricos del pipeline CI/CD
- **`framefuse://docker/registry-info`** - Información del Container Registry
- **`framefuse://deployment/metrics`** - Métricas de despliegues y rendimiento

## 🛠️ Instalación

### **Dependencias:**
```bash
# Instalar SDK de MCP (opcional, para desarrollo local)
pnpm add @modelcontextprotocol/sdk --save-dev
```

### **Ejecutar el Servidor:**
```bash
# Desde la raíz del proyecto
node scripts/framefuse-mcp-server.js
```

## 🔧 Configuración en GitLab

### **1. Habilitar GitLab Duo:**
```bash
# En tu proyecto GitLab:
Settings > GitLab Duo > Enable GitLab Duo features
```

### **2. Conectar MCP Server:**
El servidor MCP se puede conectar de dos formas:

#### **Opción A: Servidor Local (Desarrollo)**
```bash
# Ejecutar en tu máquina local
node scripts/framefuse-mcp-server.js

# Configurar en GitLab Duo para conectarse al puerto local
```

#### **Opción B: Servidor en Producción**
```bash
# Desplegar como servicio separado
# Configurar endpoint accesible desde GitLab
```

## 💬 Uso con GitLab Duo Chat

### **Ejemplos de Consultas:**

```bash
# Análisis de rendimiento
"Analiza el rendimiento del pipeline de FrameFuse"
"¿Por qué el último build tomó tanto tiempo?"

# Optimizaciones
"¿Cómo puedo acelerar los builds de Docker?"
"Optimiza la estrategia de cache del proyecto"

# Compatibilidad
"¿FFmpeg es compatible con GitLab CI?"
"Verifica codecs disponibles en el contenedor"

# Seguridad
"Escanea vulnerabilidades en la imagen Docker"
"¿Hay problemas de seguridad en el registry?"
```

### **Respuestas Típicas:**

```
## 📊 Pipeline Performance Analysis

**Pipeline ID:** 12345

### 🎯 Recommendations:
- ✅ Consider using Docker layer caching for node_modules
- ✅ Parallelize test execution to reduce build time
- ✅ Use GitLab cache for FFmpeg binaries

### 📈 Estimated Improvements:
- **Build Time:** 35% faster
- **Cost Savings:** $12/month
```

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitLab Duo    │────│   MCP Server     │────│   FrameFuse     │
│   (AI Chat)     │    │   (framefuse-    │    │   (API, Docker,  │
│                 │    │    mcp-server)   │    │    GitLab CI)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   MCP Protocol      │
                    │   (Standardized)    │
                    └─────────────────────┘
```

## 📊 Métricas y Monitoreo

### **Datos Recopilados:**
- Tiempos de build y deployment
- Tamaño y vulnerabilidades de imágenes Docker
- Rendimiento de la API (latencia, uptime)
- Estadísticas del Container Registry
- Logs de error y problemas comunes

### **Insights Automáticos:**
- Detección de builds lentos
- Alertas de vulnerabilidades de seguridad
- Sugerencias de optimización de cache
- Recomendaciones de configuración

## 🔒 Seguridad

### **Permisos MCP:**
- **Lectura**: Acceso a métricas y logs públicos
- **Sin Escritura**: No modifica código ni configuración
- **Aislado**: Funciona en contenedor separado

### **Variables Sensibles:**
- Tokens de API protegidos
- Credenciales de registry encriptadas
- Datos de usuario anonimizados

## 🚨 Troubleshooting

### **Problemas Comunes:**

#### **MCP Server no responde:**
```bash
# Verificar que esté ejecutándose
ps aux | grep framefuse-mcp-server

# Revisar logs
tail -f /var/log/framefuse-mcp.log
```

#### **GitLab Duo no conecta:**
```bash
# Verificar configuración de red
curl http://localhost:3001/health

# Revisar permisos de GitLab Duo
# Settings > GitLab Duo > Check permissions
```

#### **Datos no actualizados:**
```bash
# Forzar actualización de cache
# El servidor MCP actualiza automáticamente cada 5 minutos
# Para actualización manual, reiniciar el servicio
```

## 📚 Recursos Adicionales

- [Documentación oficial de MCP](https://modelcontextprotocol.io/)
- [GitLab Duo Documentation](https://docs.gitlab.com/user/gitlab_duo/)
- [GitLab CI/CD Best Practices](https://docs.gitlab.com/ci/optimization/)

## 🤝 Contribuir

Para agregar nuevas herramientas MCP:

1. **Definir la herramienta** en `TOOLS` array
2. **Implementar la lógica** en `executeTool()` method
3. **Agregar tests** para validar funcionamiento
4. **Actualizar documentación**

```javascript
// Ejemplo de nueva herramienta
{
  name: 'analyze_code_quality',
  description: 'Analiza la calidad del código y sugiere mejoras',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: { type: 'string' }
    }
  }
}
```

---

**¿Necesitas ayuda configurando MCP para tu proyecto FrameFuse?** 🚀
