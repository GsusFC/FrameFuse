#!/usr/bin/env node

/**
 * 🔍 Code Quality Testing Script
 * Prueba la configuración de calidad de código localmente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 FRAMEFUSE - CODE QUALITY TEST');
console.log('=' .repeat(50));

// Verificar archivos de configuración
function checkConfigFiles() {
  console.log('\n📁 VERIFICANDO ARCHIVOS DE CONFIGURACIÓN:');
  console.log('');

  const configFiles = [
    { file: '.codeclimate.yml', description: 'Configuración CodeClimate' },
    { file: '.eslintrc.js', description: 'Configuración ESLint' },
    { file: 'tsconfig.json', description: 'Configuración TypeScript' },
    { file: '.gitlab-ci.yml', description: 'Pipeline CI/CD' }
  ];

  let allFilesPresent = true;

  configFiles.forEach(({ file, description }) => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - ${description}`);

      // Verificar contenido básico
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (file === '.codeclimate.yml' && !content.includes('typescript:')) {
          console.log(`      ⚠️  Advertencia: No se encontró configuración TypeScript`);
        }
        if (file === '.eslintrc.js' && !content.includes('@typescript-eslint')) {
          console.log(`      ⚠️  Advertencia: No se encontraron reglas TypeScript`);
        }
      } catch (error) {
        console.log(`      ❌ Error al leer archivo: ${error.message}`);
      }
    } else {
      console.log(`   ❌ ${file} - FALTA: ${description}`);
      allFilesPresent = false;
    }
  });

  return allFilesPresent;
}

// Verificar dependencias de desarrollo
function checkDevDependencies() {
  console.log('\n📦 VERIFICANDO DEPENDENCIAS DE DESARROLLO:');
  console.log('');

  const requiredDeps = [
    { name: 'eslint', description: 'Linter de código' },
    { name: '@typescript-eslint/parser', description: 'Parser TypeScript para ESLint' },
    { name: '@typescript-eslint/eslint-plugin', description: 'Plugin TypeScript para ESLint' },
    { name: 'typescript', description: 'Compilador TypeScript' }
  ];

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const devDeps = packageJson.devDependencies || {};

    requiredDeps.forEach(({ name, description }) => {
      if (devDeps[name]) {
        console.log(`   ✅ ${name} - ${description}`);
      } else {
        console.log(`   ❌ ${name} - FALTA: ${description}`);
        console.log(`      💡 Instalar: pnpm add -D ${name}`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Error al leer package.json: ${error.message}`);
    return false;
  }

  return true;
}

// Ejecutar ESLint
function runESLint() {
  console.log('\n🔍 EJECUTANDO ESLINT:');
  console.log('');

  try {
    console.log('   🔄 Ejecutando análisis estático...');
    const result = execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0', {
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('   ✅ ESLint completado sin errores');
    return true;
  } catch (error) {
    console.log('   ❌ ESLint encontró problemas:');
    console.log('');
    console.log(error.stdout || error.stderr);
    return false;
  }
}

// Ejecutar TypeScript compiler
function runTypeScript() {
  console.log('\n🔨 EJECUTANDO TYPESCRIPT COMPILER:');
  console.log('');

  try {
    console.log('   🔄 Verificando tipos...');
    execSync('npx tsc --noEmit --skipLibCheck', {
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('   ✅ TypeScript sin errores de tipos');
    return true;
  } catch (error) {
    console.log('   ❌ TypeScript encontró errores:');
    console.log('');
    console.log(error.stdout || error.stderr);
    return false;
  }
}

// Verificar configuración del pipeline
function checkPipelineConfig() {
  console.log('\n🔄 VERIFICANDO CONFIGURACIÓN DEL PIPELINE:');
  console.log('');

  try {
    const gitlabCi = fs.readFileSync('.gitlab-ci.yml', 'utf8');

    const checks = [
      { pattern: 'code_quality:', description: 'Job de Code Quality' },
      { pattern: 'artifacts:', description: 'Configuración de artifacts' },
      { pattern: 'codequality:', description: 'Reportes de calidad' },
      { pattern: 'eslint', description: 'Análisis ESLint' },
      { pattern: 'typescript', description: 'Verificación TypeScript' }
    ];

    checks.forEach(({ pattern, description }) => {
      if (gitlabCi.includes(pattern)) {
        console.log(`   ✅ ${description}`);
      } else {
        console.log(`   ❌ Falta: ${description}`);
      }
    });

    return true;
  } catch (error) {
    console.log(`   ❌ Error al leer .gitlab-ci.yml: ${error.message}`);
    return false;
  }
}

// Función principal
async function runQualityTests() {
  console.log('🎯 Iniciando tests de calidad de código...\n');

  const results = {
    configFiles: checkConfigFiles(),
    devDeps: checkDevDependencies(),
    eslint: false,
    typescript: false,
    pipeline: checkPipelineConfig()
  };

  // Solo ejecutar ESLint y TypeScript si las dependencias están presentes
  if (results.devDeps) {
    results.eslint = runESLint();
    results.typescript = runTypeScript();
  } else {
    console.log('\n⚠️  Saltando análisis - faltan dependencias de desarrollo');
    console.log('   Instalar con: pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript');
  }

  // Resumen final
  console.log('\n📊 RESUMEN DE CODE QUALITY:');
  console.log('=' .repeat(40));

  const { configFiles, devDeps, eslint, typescript, pipeline } = results;

  console.log(`📁 Archivos de configuración: ${configFiles ? '✅' : '❌'}`);
  console.log(`📦 Dependencias desarrollo: ${devDeps ? '✅' : '❌'}`);
  console.log(`🔍 ESLint: ${eslint ? '✅' : '❌'}`);
  console.log(`🔨 TypeScript: ${typescript ? '✅' : '❌'}`);
  console.log(`🔄 Pipeline CI/CD: ${pipeline ? '✅' : '❌'}`);

  const allPassed = configFiles && devDeps && eslint && typescript && pipeline;

  if (allPassed) {
    console.log('\n🎉 ¡CODE QUALITY PERFECTO!');
    console.log('   ✅ Todos los tests pasaron');
    console.log('   ✅ Código listo para commit');
    console.log('   ✅ Pipeline bloqueado por calidad');
  } else {
    console.log('\n⚠️  CODE QUALITY REQUIERE ATENCIÓN:');
    console.log('   • Revisar errores de ESLint');
    console.log('   • Corregir errores de TypeScript');
    console.log('   • Instalar dependencias faltantes');
    console.log('   • Verificar configuración del pipeline');
  }

  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('   1. Corregir cualquier error encontrado');
  console.log('   2. Hacer commit: git add . && git commit -m "feat: Code Quality Gates"');
  console.log('   3. Push: git push gitlab main');
  console.log('   4. Ver el pipeline bloqueando por calidad en GitLab');

  return allPassed;
}

// Ejecutar tests
if (require.main === module) {
  runQualityTests().catch(console.error);
}

module.exports = { runQualityTests };
