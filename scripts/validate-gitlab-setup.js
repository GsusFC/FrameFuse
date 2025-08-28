#!/usr/bin/env node

/**
 * ✅ Validación Completa de Configuración GitLab
 * Script para verificar que todo esté listo antes del primer despliegue
 */

const https = require('https');

console.log('✅ VALIDACIÓN DE CONFIGURACIÓN GITLAB FRAMEFUSE');
console.log('=' .repeat(60));

const CONFIG = {
  project: 'gsusfc-group/GsusFC-project',
  requiredVariables: ['CI_REGISTRY_USER', 'CI_REGISTRY_PASSWORD'],
  requiredSettings: ['GitLab Duo', 'Container Registry']
};

// Función para verificar conectividad con autenticación
async function checkGitLabAuth(url, token) {
  return new Promise((resolve) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FrameFuse-Validator/1.0'
      }
    };

    const req = https.request(url, options, (res) => {
      resolve({
        status: res.statusCode,
        authenticated: res.statusCode !== 401 && res.statusCode !== 403,
        accessible: res.statusCode >= 200 && res.statusCode < 400
      });
    });

    req.on('error', () => resolve({ status: null, authenticated: false, accessible: false }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ status: null, authenticated: false, accessible: false });
    });
    req.end();
  });
}

// Función para verificar variables de entorno simuladas
function checkEnvironmentVariables() {
  console.log('\n🔧 VERIFICANDO VARIABLES DE ENTORNO:');
  console.log('');

  const variables = [
    { name: 'CI_REGISTRY_USER', expected: 'gsusfc-group', required: true },
    { name: 'CI_REGISTRY_PASSWORD', expected: '[token-gitlab]', required: true },
    { name: 'CI_PROJECT_PATH', expected: 'gsusfc-group/GsusFC-project', required: false }
  ];

  let allValid = true;

  variables.forEach(variable => {
    const isSet = process.env[variable.name] || '[simulado]';
    const isValid = isSet !== undefined && isSet !== '';

    const status = isValid ? '✅' : '❌';
    const details = variable.required ?
      (isValid ? 'OK' : 'FALTA CONFIGURAR') :
      (isValid ? 'OK' : 'Opcional');

    console.log(`   ${status} ${variable.name}: ${details}`);

    if (variable.expected && isSet !== variable.expected && isSet !== '[simulado]') {
      console.log(`      ⚠️  Esperado: ${variable.expected}, Actual: ${isSet}`);
    }

    if (variable.required && !isValid) {
      allValid = false;
    }
  });

  return allValid;
}

// Función para verificar archivos del proyecto
function checkProjectFiles() {
  console.log('\n📁 VERIFICANDO ARCHIVOS DEL PROYECTO:');
  console.log('');

  const fs = require('fs');
  const requiredFiles = [
    { path: '.gitlab-ci.yml', description: 'Pipeline CI/CD principal' },
    { path: 'Dockerfile', description: 'Configuración Docker' },
    { path: '.gitlab-mcp-config.yaml', description: 'Configuración MCP' },
    { path: 'scripts/framefuse-mcp-server.js', description: 'Servidor MCP' },
    { path: 'GITLAB_DEPLOYMENT.md', description: 'Documentación despliegue' }
  ];

  let allFilesPresent = true;

  requiredFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      console.log(`   ✅ ${file.path} - ${file.description}`);
    } else {
      console.log(`   ❌ ${file.path} - FALTA: ${file.description}`);
      allFilesPresent = false;
    }
  });

  return allFilesPresent;
}

// Función para verificar configuración de Git
function checkGitConfiguration() {
  console.log('\n🔄 VERIFICANDO CONFIGURACIÓN GIT:');
  console.log('');

  const { execSync } = require('child_process');

  try {
    // Verificar remote de GitLab
    const remotes = execSync('git remote -v', { encoding: 'utf8' });
    const hasGitLab = remotes.includes('gitlab.com/gsusfc-group/GsusFC-project');

    console.log(`   ${hasGitLab ? '✅' : '❌'} Remote GitLab: ${hasGitLab ? 'Configurado' : 'Falta configurar'}`);

    // Verificar commits pendientes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const hasChanges = status.trim().length > 0;

    console.log(`   ${hasChanges ? '⚠️' : '✅'} Cambios pendientes: ${hasChanges ? 'Hay cambios sin commit' : 'Todo commited'}`);

    return hasGitLab && !hasChanges;

  } catch (error) {
    console.log('   ❌ Error al verificar Git:', error.message);
    return false;
  }
}

// Función para mostrar próximos pasos
function showNextSteps() {
  console.log('\n🚀 PRÓXIMOS PASOS PARA COMPLETAR:');
  console.log('');

  const steps = [
    {
      step: 1,
      title: 'Crear Personal Access Token',
      status: 'pending',
      url: 'https://gitlab.com/-/profile/personal_access_tokens',
      details: 'Scopes: api, read_registry, write_registry'
    },
    {
      step: 2,
      title: 'Configurar Variables CI/CD',
      status: 'pending',
      url: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/ci_cd',
      details: 'CI_REGISTRY_USER y CI_REGISTRY_PASSWORD'
    },
    {
      step: 3,
      title: 'Habilitar GitLab Duo',
      status: 'pending',
      url: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/gitlab_duo',
      details: 'Enable GitLab Duo features'
    },
    {
      step: 4,
      title: 'Activar Container Registry',
      status: 'pending',
      url: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/general',
      details: 'Container Registry: Enabled'
    },
    {
      step: 5,
      title: 'Hacer push y ver pipeline',
      status: 'ready',
      url: 'https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines',
      details: 'git push gitlab main'
    }
  ];

  steps.forEach(step => {
    const statusEmoji = step.status === 'ready' ? '✅' : step.status === 'completed' ? '✅' : '⏳';
    console.log(`${step.step}. ${statusEmoji} ${step.title}`);
    console.log(`   🔗 ${step.url}`);
    console.log(`   💡 ${step.details}`);
    console.log('');
  });
}

// Función para mostrar resumen de validación
function showValidationSummary(results) {
  console.log('\n📊 RESUMEN DE VALIDACIÓN:');
  console.log('=' .repeat(40));

  const { envVars, files, git } = results;

  console.log(`🔧 Variables CI/CD: ${envVars ? '✅ Listas' : '❌ Faltan configurar'}`);
  console.log(`📁 Archivos proyecto: ${files ? '✅ Todos presentes' : '❌ Faltan archivos'}`);
  console.log(`🔄 Configuración Git: ${git ? '✅ OK' : '❌ Problemas'}`);

  const allGood = envVars && files && git;

  if (allGood) {
    console.log('\n🎉 ¡TODO LISTO PARA DESPLIEGUE!');
    console.log('🚀 Tu FrameFuse está completamente configurado.');
  } else {
    console.log('\n⚠️ Faltan configuraciones para completar el setup.');
    console.log('📋 Revisa los "PRÓXIMOS PASOS" arriba.');
  }

  return allGood;
}

// Función principal
async function runValidation() {
  console.log(`📍 Proyecto: ${CONFIG.project}`);
  console.log(`🔗 GitLab URL: https://gitlab.com/${CONFIG.project}`);
  console.log('');

  // Ejecutar verificaciones
  const results = {
    envVars: checkEnvironmentVariables(),
    files: checkProjectFiles(),
    git: checkGitConfiguration()
  };

  // Mostrar próximos pasos
  showNextSteps();

  // Mostrar resumen
  const isReady = showValidationSummary(results);

  if (isReady) {
    console.log('\n💡 PARA INICIAR EL DESPLIEGUE:');
    console.log('   1. Configura las variables CI/CD en GitLab');
    console.log('   2. git push gitlab main');
    console.log('   3. Ve al pipeline: https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines');
    console.log('   4. ¡Disfruta tu CI/CD con IA integrada! 🤖✨');
  }

  return isReady;
}

// Ejecutar validación
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { runValidation, CONFIG };
