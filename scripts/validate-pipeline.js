#!/usr/bin/env node

/**
 * ✅ Validador de Pipeline GitLab CI/CD para FrameFuse
 * Verifica que todas las correcciones estén aplicadas correctamente
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

console.log('✅ VALIDADOR DE PIPELINE FRAMEFUSE');
console.log('=' .repeat(60));

// Configuración de validación
const VALIDATION_CONFIG = {
  requiredFiles: [
    { path: '.gitlab-ci.yml', description: 'Pipeline principal' },
    { path: 'Dockerfile', description: 'Imagen Docker' },
    { path: 'api/health.js', description: 'Health check script' },
    { path: 'scripts/test-mcp.js', description: 'Tests MCP' },
    { path: 'api/server.js', description: 'Servidor Express' }
  ],
  requiredVariables: [
    'NODE_VERSION',
    'ENVIRONMENT', 
    'ENABLE_MCP',
    'REGISTRY_PREFIX',
    'HEALTH_CHECK_ENABLED'
  ]
};

// Función para validar archivos requeridos
function validateRequiredFiles() {
  console.log('\n📁 VALIDANDO ARCHIVOS REQUERIDOS:');
  console.log('');
  
  let allFilesPresent = true;
  
  VALIDATION_CONFIG.requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file.path);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file.path} - ${file.description}`);
    } else {
      console.log(`   ❌ ${file.path} - FALTA: ${file.description}`);
      allFilesPresent = false;
    }
  });
  
  return allFilesPresent;
}

// Función para validar sintaxis YAML
function validateYAMLSyntax() {
  console.log('\n📝 VALIDANDO SINTAXIS YAML:');
  console.log('');
  
  try {
    const yamlPath = path.join(process.cwd(), '.gitlab-ci.yml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(yamlContent);
    
    console.log('   ✅ Sintaxis YAML válida');
    
    // Verificar estructura básica
    if (parsed.stages && parsed.stages.includes('build') && 
        parsed.stages.includes('test') && parsed.stages.includes('deploy')) {
      console.log('   ✅ Etapas del pipeline correctas');
    } else {
      console.log('   ❌ Etapas del pipeline incorrectas');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Error de sintaxis YAML:', error.message);
    return false;
  }
}

// Función para validar variables del pipeline
function validatePipelineVariables() {
  console.log('\n🔧 VALIDANDO VARIABLES DEL PIPELINE:');
  console.log('');
  
  try {
    const yamlPath = path.join(process.cwd(), '.gitlab-ci.yml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    
    let allVariablesPresent = true;
    
    VALIDATION_CONFIG.requiredVariables.forEach(variable => {
      if (yamlContent.includes(variable)) {
        console.log(`   ✅ ${variable}: Definida`);
      } else {
        console.log(`   ❌ ${variable}: FALTA`);
        allVariablesPresent = false;
      }
    });
    
    // Verificar que HEALTH_CHECK_ENABLED esté mapeada
    if (yamlContent.includes('HEALTH_CHECK_ENABLED: $[[ inputs.health_check_enabled ]]')) {
      console.log('   ✅ HEALTH_CHECK_ENABLED: Correctamente mapeada');
    } else {
      console.log('   ❌ HEALTH_CHECK_ENABLED: No mapeada correctamente');
      allVariablesPresent = false;
    }
    
    return allVariablesPresent;
  } catch (error) {
    console.log('   ❌ Error validando variables:', error.message);
    return false;
  }
}

// Función para validar correcciones específicas
function validateSpecificFixes() {
  console.log('\n🔧 VALIDANDO CORRECCIONES ESPECÍFICAS:');
  console.log('');
  
  try {
    const yamlPath = path.join(process.cwd(), '.gitlab-ci.yml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    
    let allFixesApplied = true;
    
    // Verificar que el error de sintaxis esté corregido
    if (!yamlContent.includes('        - node scripts/test-mcp.js')) {
      console.log('   ✅ Error de sintaxis YAML corregido');
    } else {
      console.log('   ❌ Error de sintaxis YAML aún presente');
      allFixesApplied = false;
    }
    
    // Verificar cache optimizado
    if (yamlContent.includes('${CI_COMMIT_REF_SLUG}-${ENVIRONMENT}-${NODE_VERSION}')) {
      console.log('   ✅ Cache optimizado con NODE_VERSION');
    } else {
      console.log('   ❌ Cache no optimizado');
      allFixesApplied = false;
    }
    
    // Verificar Docker cache
    if (yamlContent.includes('--cache-from') && yamlContent.includes('BUILDKIT_INLINE_CACHE')) {
      console.log('   ✅ Docker cache configurado');
    } else {
      console.log('   ❌ Docker cache no configurado');
      allFixesApplied = false;
    }
    
    return allFixesApplied;
  } catch (error) {
    console.log('   ❌ Error validando correcciones:', error.message);
    return false;
  }
}

// Función para validar health check
function validateHealthCheck() {
  console.log('\n💚 VALIDANDO HEALTH CHECK:');
  console.log('');
  
  try {
    // Verificar que health.js existe y es ejecutable
    const healthPath = path.join(process.cwd(), 'api/health.js');
    if (fs.existsSync(healthPath)) {
      const healthContent = fs.readFileSync(healthPath, 'utf8');
      if (healthContent.includes('healthCheck') && healthContent.includes('http.request')) {
        console.log('   ✅ Health check script funcional');
      } else {
        console.log('   ❌ Health check script incompleto');
        return false;
      }
    } else {
      console.log('   ❌ Health check script no encontrado');
      return false;
    }
    
    // Verificar Dockerfile health check
    const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
      if (dockerContent.includes('HEALTHCHECK') && dockerContent.includes('api/health.js')) {
        console.log('   ✅ Dockerfile health check configurado');
      } else {
        console.log('   ❌ Dockerfile health check no configurado');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Error validando health check:', error.message);
    return false;
  }
}

// Función para mostrar próximos pasos
function showNextSteps(allValid) {
  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('=' .repeat(60));
  
  if (allValid) {
    console.log('✅ ¡Todas las validaciones pasaron exitosamente!');
    console.log('');
    console.log('📋 Pasos para desplegar:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "fix: aplicar correcciones críticas GitLab CI/CD"');
    console.log('   3. git push gitlab main');
    console.log('   4. Verificar pipeline en GitLab');
    console.log('');
    console.log('🔗 URLs importantes:');
    console.log('   • Pipeline: https://gitlab.com/tu-usuario/FrameFuse/-/pipelines');
    console.log('   • Registry: https://gitlab.com/tu-usuario/FrameFuse/container_registry');
    console.log('   • Variables: https://gitlab.com/tu-usuario/FrameFuse/-/settings/ci_cd');
  } else {
    console.log('❌ Algunas validaciones fallaron');
    console.log('');
    console.log('🔧 Acciones requeridas:');
    console.log('   • Revisar los errores mostrados arriba');
    console.log('   • Aplicar las correcciones necesarias');
    console.log('   • Ejecutar este script nuevamente');
  }
}

// Función principal
async function runValidation() {
  console.log('🎯 Ejecutando validación completa del pipeline...\n');
  
  const results = {
    files: validateRequiredFiles(),
    yaml: validateYAMLSyntax(),
    variables: validatePipelineVariables(),
    fixes: validateSpecificFixes(),
    healthCheck: validateHealthCheck()
  };
  
  const allValid = Object.values(results).every(result => result === true);
  
  console.log('\n📊 RESUMEN DE VALIDACIÓN:');
  console.log('=' .repeat(60));
  console.log(`📁 Archivos requeridos: ${results.files ? '✅' : '❌'}`);
  console.log(`📝 Sintaxis YAML: ${results.yaml ? '✅' : '❌'}`);
  console.log(`🔧 Variables pipeline: ${results.variables ? '✅' : '❌'}`);
  console.log(`🔧 Correcciones específicas: ${results.fixes ? '✅' : '❌'}`);
  console.log(`💚 Health check: ${results.healthCheck ? '✅' : '❌'}`);
  console.log('');
  console.log(`📈 Tasa de éxito: ${Math.round((Object.values(results).filter(r => r).length / Object.values(results).length) * 100)}%`);
  
  showNextSteps(allValid);
  
  return allValid;
}

// Ejecutar validación si se llama directamente
if (require.main === module) {
  runValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando validación:', error);
      process.exit(1);
    });
}

module.exports = { runValidation };
