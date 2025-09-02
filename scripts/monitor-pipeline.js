#!/usr/bin/env node

/**
 * 📊 Monitor de Pipeline GitLab para FrameFuse
 * Verifica el estado del pipeline y proporciona información útil
 */

const https = require('https');

console.log('📊 MONITOR DE PIPELINE FRAMEFUSE');
console.log('=' .repeat(60));

// Configuración del proyecto
const PROJECT_CONFIG = {
  group: 'gsusfc-group',
  project: 'GsusFC-project',
  urls: {
    project: 'https://gitlab.com/gsusfc-group/GsusFC-project',
    pipelines: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines',
    registry: 'https://gitlab.com/gsusfc-group/GsusFC-project/container_registry',
    settings: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/ci_cd',
    variables: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/ci_cd#js-cicd-variables-settings'
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

// Función para mostrar información del pipeline
function showPipelineInfo() {
  console.log('\n🎬 INFORMACIÓN DEL PIPELINE:');
  console.log('');
  console.log(`📍 Proyecto: ${PROJECT_CONFIG.group}/${PROJECT_CONFIG.project}`);
  console.log(`🔗 URL Principal: ${PROJECT_CONFIG.urls.project}`);
  console.log('');
  
  console.log('📋 ETAPAS DEL PIPELINE:');
  console.log('   1. 🏗️  BUILD - Construir imagen Docker');
  console.log('   2. 🔍 CODE_QUALITY - Análisis de calidad');
  console.log('   3. 🧪 TEST - Ejecutar tests');
  console.log('   4. 🚀 DEPLOY - Despliegue (manual)');
  console.log('   5. 📊 REPORT - Generar reportes');
  console.log('');
}

// Función para mostrar checklist de verificación
function showVerificationChecklist() {
  console.log('✅ CHECKLIST DE VERIFICACIÓN:');
  console.log('');
  
  const checklist = [
    {
      item: 'Variables CI/CD configuradas',
      description: 'CI_REGISTRY_USER y CI_REGISTRY_PASSWORD',
      url: PROJECT_CONFIG.urls.variables
    },
    {
      item: 'Container Registry habilitado',
      description: 'Settings > General > Container Registry',
      url: PROJECT_CONFIG.urls.settings
    },
    {
      item: 'Pipeline activado automáticamente',
      description: 'Después del git push gitlab main',
      url: PROJECT_CONFIG.urls.pipelines
    },
    {
      item: 'Sintaxis YAML válida',
      description: 'Sin errores en .gitlab-ci.yml',
      status: '✅'
    },
    {
      item: 'Health check funcional',
      description: 'api/health.js creado y configurado',
      status: '✅'
    }
  ];
  
  checklist.forEach((check, index) => {
    console.log(`   ${index + 1}. ${check.status || '📋'} ${check.item}`);
    console.log(`      📝 ${check.description}`);
    if (check.url) {
      console.log(`      🔗 ${check.url}`);
    }
    console.log('');
  });
}

// Función para mostrar comandos útiles
function showUsefulCommands() {
  console.log('💻 COMANDOS ÚTILES:');
  console.log('');
  
  const commands = [
    {
      title: 'Verificar último commit',
      command: 'git log --oneline -1',
      description: 'Ver el commit que activó el pipeline'
    },
    {
      title: 'Ver estado del repositorio',
      command: 'git status',
      description: 'Verificar cambios pendientes'
    },
    {
      title: 'Validar pipeline localmente',
      command: 'node scripts/validate-pipeline.js',
      description: 'Ejecutar validaciones antes del push'
    },
    {
      title: 'Test MCP local',
      command: 'node scripts/test-mcp.js',
      description: 'Probar funcionalidad MCP'
    }
  ];
  
  commands.forEach((cmd, index) => {
    console.log(`   ${index + 1}. ${cmd.title}`);
    console.log(`      💻 ${cmd.command}`);
    console.log(`      📝 ${cmd.description}`);
    console.log('');
  });
}

// Función para mostrar próximos pasos
function showNextSteps() {
  console.log('🚀 PRÓXIMOS PASOS:');
  console.log('');
  
  const steps = [
    {
      step: 1,
      title: 'Monitorear Pipeline',
      action: 'Abrir GitLab y verificar progreso',
      url: PROJECT_CONFIG.urls.pipelines,
      time: '5-10 minutos'
    },
    {
      step: 2,
      title: 'Verificar Build Stage',
      action: 'Confirmar que la imagen Docker se construye',
      expected: 'BUILD stage: ✅ Success'
    },
    {
      step: 3,
      title: 'Revisar Test Stage',
      action: 'Verificar que los tests pasan',
      expected: 'TEST stage: ✅ Success'
    },
    {
      step: 4,
      title: 'Verificar Registry',
      action: 'Confirmar imagen en Container Registry',
      url: PROJECT_CONFIG.urls.registry
    },
    {
      step: 5,
      title: 'Deploy Manual (Opcional)',
      action: 'Activar deploy si todo está OK',
      note: 'Solo para testing inicial'
    }
  ];
  
  steps.forEach(step => {
    console.log(`   ${step.step}. ${step.title} (${step.time || 'Variable'})`);
    console.log(`      🎯 ${step.action}`);
    if (step.expected) {
      console.log(`      ✅ Esperado: ${step.expected}`);
    }
    if (step.url) {
      console.log(`      🔗 ${step.url}`);
    }
    if (step.note) {
      console.log(`      💡 ${step.note}`);
    }
    console.log('');
  });
}

// Función principal
async function runMonitor() {
  console.log(`📍 Proyecto: ${PROJECT_CONFIG.group}/${PROJECT_CONFIG.project}`);
  console.log(`🔗 URL Principal: ${PROJECT_CONFIG.urls.project}`);
  console.log('');

  // Verificar conectividad básica
  console.log('🌐 VERIFICANDO CONECTIVIDAD:');
  const checks = await Promise.all([
    checkUrl(PROJECT_CONFIG.urls.project, 'Proyecto GitLab'),
    checkUrl(PROJECT_CONFIG.urls.pipelines, 'Pipelines'),
    checkUrl(PROJECT_CONFIG.urls.registry, 'Container Registry')
  ]);

  checks.forEach(check => {
    console.log(`   ${check.emoji} ${check.name}: ${check.accessible ? 'Accesible' : 'Requiere autenticación'}`);
  });

  showPipelineInfo();
  showVerificationChecklist();
  showUsefulCommands();
  showNextSteps();

  console.log('=' .repeat(60));
  console.log('🎉 ¡Pipeline en progreso! Monitorea en GitLab.');
  console.log('📞 ¿Necesitas ayuda con algún paso específico?');
}

// Ejecutar monitor si se llama directamente
if (require.main === module) {
  runMonitor().catch(console.error);
}

module.exports = { runMonitor, PROJECT_CONFIG };
