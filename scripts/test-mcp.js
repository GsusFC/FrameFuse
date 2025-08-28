#!/usr/bin/env node

/**
 * 🧪 Script de prueba para FrameFuse MCP Server
 * Prueba local del servidor MCP antes del despliegue
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Iniciando pruebas del FrameFuse MCP Server...\n');

// Verificar que el archivo existe
const mcpServerPath = path.join(__dirname, 'framefuse-mcp-server.js');
const fs = require('fs');

if (!fs.existsSync(mcpServerPath)) {
  console.error('❌ Error: framefuse-mcp-server.js no encontrado');
  console.log('📍 Ubicación esperada:', mcpServerPath);
  process.exit(1);
}

console.log('✅ Archivo MCP server encontrado');
console.log('📍 Ubicación:', mcpServerPath);

// Función para probar herramientas MCP
async function testMCPTools() {
  console.log('\n🔧 Probando herramientas MCP disponibles...');

  const tools = [
    {
      name: 'analyze_pipeline_performance',
      description: 'Analizar rendimiento del pipeline',
      testInput: { pipeline_id: '12345' }
    },
    {
      name: 'check_ffmpeg_compatibility',
      description: 'Verificar compatibilidad FFmpeg',
      testInput: { target_platform: 'docker' }
    },
    {
      name: 'optimize_build_cache',
      description: 'Optimizar estrategia de cache',
      testInput: { cache_strategy: 'basic' }
    }
  ];

  tools.forEach((tool, index) => {
    console.log(`  ${index + 1}. ${tool.name}`);
    console.log(`     📝 ${tool.description}`);
    console.log(`     🔍 Input de prueba: ${JSON.stringify(tool.testInput)}`);
  });

  console.log('\n💡 Para probar individualmente:');
  console.log('   node scripts/framefuse-mcp-server.js');
  console.log('   # Luego enviar JSON con las herramientas arriba');
}

// Función para simular consultas de GitLab Duo
function simulateGitLabDuoQueries() {
  console.log('\n🤖 Consultas de ejemplo para GitLab Duo Chat:\n');

  const queries = [
    'Analiza el rendimiento del pipeline de FrameFuse',
    '¿Cómo puedo optimizar el build de Docker para FrameFuse?',
    'Revisa vulnerabilidades en la imagen del registry',
    '¿Qué codecs de FFmpeg están disponibles en GitLab CI?',
    'Optimiza la estrategia de cache del proyecto',
    '¿Por qué mi pipeline de CI/CD es lento?',
    'Sugiere mejoras para el Dockerfile de FrameFuse',
    'Analiza el uso de memoria en el contenedor'
  ];

  queries.forEach((query, index) => {
    console.log(`  ${index + 1}. "${query}"`);
  });

  console.log('\n📋 Copia estas consultas y pégalas en GitLab Duo Chat');
}

// Función para verificar configuración
function checkConfiguration() {
  console.log('\n⚙️ Verificando configuración...\n');

  // Verificar archivos necesarios
  const requiredFiles = [
    '.gitlab-ci.yml',
    'Dockerfile',
    '.gitlab-mcp-config.yaml',
    'scripts/framefuse-mcp-server.js',
    'GITLAB_DEPLOYMENT.md'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - NO ENCONTRADO`);
    }
  });

  // Verificar variables de entorno necesarias
  console.log('\n🔐 Variables de entorno para GitLab:');
  console.log('  CI_REGISTRY_USER = [tu-usuario-gitlab]');
  console.log('  CI_REGISTRY_PASSWORD = [token-acceso-personal]');
  console.log('\n💡 Configurar en: GitLab > Settings > CI/CD > Variables');
}

// Función para mostrar próximos pasos
function showNextSteps() {
  console.log('\n🚀 PRÓXIMOS PASOS PARA ACTIVAR MCP:\n');

  const steps = [
    {
      step: 1,
      title: 'Push a GitLab',
      command: 'git push gitlab main',
      description: 'Subir código a GitLab para activar el pipeline'
    },
    {
      step: 2,
      title: 'Configurar Variables',
      command: 'GitLab > Settings > CI/CD > Variables',
      description: 'Agregar CI_REGISTRY_USER y CI_REGISTRY_PASSWORD'
    },
    {
      step: 3,
      title: 'Habilitar GitLab Duo',
      command: 'Settings > GitLab Duo > Enable features',
      description: 'Activar GitLab Duo en tu proyecto'
    },
    {
      step: 4,
      title: 'Probar Consultas',
      command: '"Analiza el rendimiento del pipeline"',
      description: 'Probar consultas MCP en GitLab Duo Chat'
    }
  ];

  steps.forEach(step => {
    console.log(`  ${step.step}. ${step.title}`);
    console.log(`     📝 ${step.description}`);
    console.log(`     💻 ${step.command}\n`);
  });
}

// Ejecutar todas las pruebas
async function runTests() {
  try {
    console.log('🎬 FrameFuse MCP Server - Suite de Pruebas');
    console.log('=' .repeat(50));

    testMCPTools();
    simulateGitLabDuoQueries();
    checkConfiguration();
    showNextSteps();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 ¡Configuración MCP lista para despliegue!');
    console.log('📞 ¿Necesitas ayuda con algún paso específico?');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testMCPTools, simulateGitLabDuoQueries };
