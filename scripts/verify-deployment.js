#!/usr/bin/env node

/**
 * 🔍 Script de verificación del despliegue FrameFuse
 * Verifica que todo esté funcionando correctamente después del push a GitLab
 */

const https = require('https');

console.log('🔍 Verificación del Despliegue FrameFuse');
console.log('=' .repeat(50));

const GITLAB_PROJECT = 'gsusfc-group/GsusFC-project';

// URLs importantes
const urls = {
  project: `https://gitlab.com/${GITLAB_PROJECT}`,
  pipelines: `https://gitlab.com/${GITLAB_PROJECT}/-/pipelines`,
  registry: `https://gitlab.com/${GITLAB_PROJECT}/-/container_registry`,
  settings: `https://gitlab.com/${GITLAB_PROJECT}/-/settings/ci_cd`,
  gitlabDuo: `https://gitlab.com/${GITLAB_PROJECT}/-/settings/gitlab_duo`
};

// Función para verificar conectividad
function checkConnectivity(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Verificaciones principales
async function runVerification() {
  console.log('\n📋 VERIFICANDO COMPONENTES:\n');

  // 1. Verificar archivos locales
  console.log('1. 📁 Archivos locales:');
  const fs = require('fs');
  const requiredFiles = [
    '.gitlab-ci.yml',
    'Dockerfile',
    '.gitlab-mcp-config.yaml',
    'scripts/framefuse-mcp-server.js'
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - FALTA`);
    }
  });

  // 2. Verificar conectividad con GitLab
  console.log('\n2. 🌐 Conectividad GitLab:');
  for (const [name, url] of Object.entries(urls)) {
    const isAccessible = await checkConnectivity(url);
    console.log(`   ${isAccessible ? '✅' : '❌'} ${name}: ${url}`);
  }

  // 3. Instrucciones finales
  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('1. Configura las variables CI/CD en GitLab');
  console.log('2. Habilita GitLab Duo');
  console.log('3. Activa Container Registry');
  console.log('4. Monitorea el pipeline');
  console.log('5. Prueba GitLab Duo Chat');

  console.log('\n💡 COMANDOS ÚTILES:');
  console.log('• Ver estado del pipeline: Abre la URL de pipelines');
  console.log('• Ver logs del build: Click en el job del pipeline');
  console.log('• Probar MCP: "Analiza el rendimiento del pipeline" en GitLab Duo Chat');
  console.log('• Ver imagen Docker: Ve a Container Registry');

  console.log('\n🎯 UNA VEZ COMPLETADO TODO:');
  console.log('Tu FrameFuse estará desplegado con IA integrada! 🤖✨');
}

// Ejecutar verificación
if (require.main === module) {
  runVerification().catch(console.error);
}

module.exports = { runVerification };
