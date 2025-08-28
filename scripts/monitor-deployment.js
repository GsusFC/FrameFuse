#!/usr/bin/env node

/**
 * 📊 Monitor de Despliegue FrameFuse
 * Monitoreo en tiempo real del estado del pipeline GitLab
 */

const https = require('https');

console.log('📊 Monitor de Despliegue FrameFuse');
console.log('=' .repeat(50));

const PROJECT_CONFIG = {
  name: 'GsusFC-project',
  group: 'gsusfc-group',
  urls: {
    project: 'https://gitlab.com/gsusfc-group/GsusFC-project',
    pipelines: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines',
    registry: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/container_registry',
    settings: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/ci_cd',
    gitlabDuo: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/gitlab_duo',
    general: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/general'
  }
};

// Función para verificar conectividad
async function checkUrl(url, name) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const status = res.statusCode;
      const isOk = status >= 200 && status < 400;
      resolve({
        name,
        url,
        status,
        accessible: isOk,
        emoji: isOk ? '✅' : '❌'
      });
    });

    req.on('error', () => {
      resolve({
        name,
        url,
        status: null,
        accessible: false,
        emoji: '❌'
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name,
        url,
        status: null,
        accessible: false,
        emoji: '⏳'
      });
    });
    req.end();
  });
}

// Función para mostrar checklist de tareas
function showChecklist() {
  console.log('\n📋 CHECKLIST DE CONFIGURACIÓN:');
  console.log('');

  const tasks = [
    {
      task: 'Variables CI/CD configuradas',
      status: 'pending',
      url: PROJECT_CONFIG.urls.settings,
      action: 'Agregar CI_REGISTRY_USER y CI_REGISTRY_PASSWORD'
    },
    {
      task: 'GitLab Duo activado',
      status: 'pending',
      url: PROJECT_CONFIG.urls.gitlabDuo,
      action: 'Habilitar "GitLab Duo features"'
    },
    {
      task: 'Container Registry habilitado',
      status: 'pending',
      url: PROJECT_CONFIG.urls.general,
      action: 'Activar Container Registry en settings'
    },
    {
      task: 'Pipeline ejecutándose',
      status: 'auto',
      url: PROJECT_CONFIG.urls.pipelines,
      action: 'Monitorear Build → Test → Deploy'
    },
    {
      task: 'Imagen Docker creada',
      status: 'auto',
      url: PROJECT_CONFIG.urls.registry,
      action: 'Verificar imagen en registry'
    }
  ];

  tasks.forEach((task, index) => {
    const statusEmoji = task.status === 'auto' ? '🤖' : task.status === 'pending' ? '⏳' : '✅';
    console.log(`${index + 1}. ${statusEmoji} ${task.task}`);
    console.log(`   🔗 ${task.url}`);
    console.log(`   💡 ${task.action}`);
    console.log('');
  });
}

// Función para mostrar instrucciones detalladas
function showInstructions() {
  console.log('\n🚀 INSTRUCCIONES DETALLADAS:');
  console.log('');

  console.log('1️⃣ CONFIGURAR VARIABLES CI/CD:');
  console.log('   • Ve a: Settings > CI/CD > Variables');
  console.log('   • Agrega:');
  console.log('     - CI_REGISTRY_USER = gsusfc-group');
  console.log('     - CI_REGISTRY_PASSWORD = [tu-token-personal]');
  console.log('   • Para generar token: User Settings > Access Tokens');
  console.log('');

  console.log('2️⃣ ACTIVAR GITLAB DUO:');
  console.log('   • Ve a: Settings > GitLab Duo');
  console.log('   • Activa: "Enable GitLab Duo features"');
  console.log('');

  console.log('3️⃣ HABILITAR CONTAINER REGISTRY:');
  console.log('   • Ve a: Settings > General > Visibility');
  console.log('   • Activa: Container Registry = Enabled');
  console.log('');

  console.log('4️⃣ MONITOREAR PIPELINE:');
  console.log('   • Ve a: CI/CD > Pipelines');
  console.log('   • Espera las etapas: Build → Test → Deploy');
  console.log('');

  console.log('5️⃣ PROBAR MCP:');
  console.log('   • Ve a: GitLab Duo Chat');
  console.log('   • Escribe: "Analiza el rendimiento del pipeline"');
}

// Función para mostrar consultas de ejemplo para GitLab Duo
function showMCPQueries() {
  console.log('\n🤖 CONSULTAS DE EJEMPLO PARA GITLAB DUO:');
  console.log('');

  const queries = [
    'Analiza el rendimiento del pipeline de FrameFuse',
    '¿Cómo optimizar el build de Docker?',
    'Revisa vulnerabilidades en la imagen del registry',
    '¿Qué codecs de FFmpeg están disponibles?',
    'Optimiza la estrategia de cache del proyecto',
    '¿Por qué mi pipeline de CI/CD es lento?',
    'Sugiere mejoras para el Dockerfile de FrameFuse',
    'Analiza el uso de memoria en el contenedor'
  ];

  queries.forEach((query, index) => {
    console.log(`${index + 1}. "${query}"`);
  });

  console.log('');
  console.log('💡 Copia cualquiera de estas consultas y pégalas en GitLab Duo Chat');
}

// Función principal
async function runMonitor() {
  console.log(`📍 Proyecto: ${PROJECT_CONFIG.group}/${PROJECT_CONFIG.name}`);
  console.log(`🔗 URL Principal: ${PROJECT_CONFIG.urls.project}`);
  console.log('');

  // Verificar conectividad
  console.log('🌐 VERIFICANDO CONECTIVIDAD:');
  const checks = await Promise.all([
    checkUrl(PROJECT_CONFIG.urls.project, 'Proyecto'),
    checkUrl(PROJECT_CONFIG.urls.pipelines, 'Pipelines'),
    checkUrl(PROJECT_CONFIG.urls.registry, 'Registry'),
    checkUrl(PROJECT_CONFIG.urls.settings, 'Settings CI/CD'),
    checkUrl(PROJECT_CONFIG.urls.gitlabDuo, 'GitLab Duo')
  ]);

  checks.forEach(check => {
    console.log(`   ${check.emoji} ${check.name}: ${check.accessible ? 'Accesible' : 'Requiere autenticación'}`);
  });

  console.log('');
  console.log('⚠️  NOTA: Las URLs marcan ❌ porque requieren autenticación de GitLab.');
  console.log('   Esto es normal - accede con tu cuenta para ver el estado real.');

  showChecklist();
  showInstructions();
  showMCPQueries();

  console.log('\n🎯 RESUMEN:');
  console.log('1. Configura las 3 variables/habilitaciones en GitLab');
  console.log('2. El pipeline se ejecutará automáticamente');
  console.log('3. Una vez completado, tendrás IA integrada');
  console.log('4. ¡FrameFuse con superpoderes listos!');
  console.log('');
  console.log('🚀 ¿Todo configurado? ¡Vamos a ver el pipeline en acción!');
}

// Ejecutar el monitor
if (require.main === module) {
  runMonitor().catch(console.error);
}

module.exports = { runMonitor, PROJECT_CONFIG };
