#!/bin/bash

# 🚀 FrameFuse GitLab + MCP Setup Script
# Configuración automática para despliegue con IA integrada

set -e

echo "🎬 FrameFuse - Configuración GitLab + MCP"
echo "=========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f ".gitlab-ci.yml" ]; then
    print_error "No estás en el directorio raíz de FrameFuse"
    print_error "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

print_success "Directorio de proyecto verificado"

# Paso 1: Verificar archivos necesarios
print_status "Verificando archivos de configuración..."

required_files=(
    ".gitlab-ci.yml"
    "Dockerfile"
    ".gitlab-mcp-config.yaml"
    "scripts/framefuse-mcp-server.js"
    "scripts/README-MCP.md"
    "GITLAB_DEPLOYMENT.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✅ $file encontrado"
    else
        print_error "❌ $file no encontrado"
        exit 1
    fi
done

# Paso 2: Verificar dependencias
print_status "Verificando dependencias..."

if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm no está instalado - instalando..."
    npm install -g pnpm
fi

print_success "Dependencias verificadas"

# Paso 3: Instalar dependencias del proyecto
print_status "Instalando dependencias del proyecto..."

if [ -f "pnpm-lock.yaml" ]; then
    pnpm install --frozen-lockfile
else
    print_warning "No se encontró pnpm-lock.yaml, instalando desde package.json"
    pnpm install
fi

print_success "Dependencias instaladas"

# Paso 4: Verificar que todo compila
print_status "Verificando compilación TypeScript..."

if command -v tsc &> /dev/null; then
    npx tsc --noEmit --skipLibCheck
    print_success "TypeScript compilación exitosa"
else
    print_warning "TypeScript CLI no disponible, saltando verificación"
fi

# Paso 5: Probar MCP server
print_status "Probando MCP server..."

if node scripts/test-mcp.js; then
    print_success "MCP server tests pasaron"
else
    print_error "Error en tests del MCP server"
    exit 1
fi

# Paso 6: Verificar configuración de Git
print_status "Verificando configuración de Git..."

if ! git status &> /dev/null; then
    print_error "No es un repositorio Git válido"
    exit 1
fi

# Verificar si hay cambios pendientes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Hay cambios pendientes en Git"
    echo "Archivos modificados:"
    git status --porcelain
    echo ""
    read -p "¿Quieres hacer commit de estos cambios? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "🚀 Preparación final para despliegue GitLab + MCP

- ✅ Verificación completa de archivos
- ✅ Dependencias instaladas y actualizadas
- ✅ Tests MCP ejecutados exitosamente
- ✅ Configuración GitLab CI/CD validada
- ✅ Documentación MCP integrada

🎯 Listo para push inicial a GitLab"
        print_success "Cambios commited"
    fi
fi

print_success "Configuración de Git verificada"

# Paso 7: Mostrar instrucciones finales
echo ""
echo "🎉 ¡CONFIGURACIÓN COMPLETADA!"
echo "=============================="
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo ""
echo "1. 🚀 Push a GitLab:"
echo "   git remote add gitlab https://gitlab.com/[tu-usuario]/[tu-proyecto].git"
echo "   git push gitlab main"
echo ""
echo "2. ⚙️ Configurar variables en GitLab:"
echo "   Settings > CI/CD > Variables"
echo "   - CI_REGISTRY_USER = [tu-usuario-gitlab]"
echo "   - CI_REGISTRY_PASSWORD = [token-acceso-personal]"
echo ""
echo "3. 🤖 Habilitar GitLab Duo:"
echo "   Settings > GitLab Duo > Enable GitLab Duo features"
echo ""
echo "4. 🧪 Probar MCP:"
echo "   Ve a GitLab Duo Chat y escribe:"
echo '   "Analiza el rendimiento del pipeline de FrameFuse"'
echo ""
echo "📚 DOCUMENTACIÓN:"
echo "   - GITLAB_DEPLOYMENT.md - Guía completa de despliegue"
echo "   - scripts/README-MCP.md - Documentación MCP detallada"
echo "   - .gitlab-mcp-config.yaml - Configuración MCP"
echo ""
print_success "¡Tu proyecto FrameFuse está listo para el futuro con IA integrada!"
echo ""
echo "🎬 ¿Necesitas ayuda con algún paso específico?"
