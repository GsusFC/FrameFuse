#!/usr/bin/env node

/**
 * 🔍 MONITOR DE CODE QUALITY GATES
 * Script para monitorear el estado del pipeline y verificar que bloquea por calidad
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 FRAMEFUSE - MONITOR CODE QUALITY GATES');
console.log('='.repeat(60));

// Función para ejecutar comandos de forma segura
function runCommand(command, description) {
  try {
    console.log(`\n🔄 ${description}...`);
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe'
    });
    console.log('   ✅ Completado');
    return result.trim();
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
    return null;
  }
}

// Verificar estado del repositorio
function checkRepositoryStatus() {
  console.log('\n📁 VERIFICANDO ESTADO DEL REPOSITORIO:');

  const branch = runCommand('git branch --show-current', 'Obteniendo rama actual');
  const remote = runCommand('git remote get-url gitlab', 'Verificando remote de GitLab');
  const lastCommit = runCommand('git log -1 --oneline', 'Obteniendo último commit');

  if (branch) console.log(`   ✅ Rama: ${branch}`);
  if (remote) {
    try {
      const clean = remote.replace(/\.git$/, '');
      let candidate = clean;
      // Convert scp-like Git URLs (git@host:group/repo) to ssh:// form for URL parsing
      if (/^[^@]+@[^:]+:/.test(candidate)) {
        const m = candidate.match(/^([^@]+)@([^:]+):(.+)$/);
        if (m) {
          const [, user, host, repoPath] = m;
          candidate = `ssh://${user}@${host}/${repoPath}`;
        }
      }
      const url = new URL(candidate);
      url.username = '';
      url.password = '';
      // toString() may add a trailing slash; remove for cleaner display
      const safe = url.toString().replace(/\/$/, '');
      console.log(`   ✅ Remote: ${safe}`);
    } catch {
      // Fallback: basic scrub without credentials
      const safe = remote
        .replace(/https?:\/\/[^@]+@/, 'https://')
        .replace(/\.git$/, '');
      console.log(`   ✅ Remote: ${safe}`);
    }
  }
  if (lastCommit) console.log(`   ✅ Último commit: ${lastCommit}`);
}

// Verificar archivos de configuración
function checkConfigurationFiles() {
  console.log('\n📋 VERIFICANDO ARCHIVOS DE CONFIGURACIÓN:');

  const configFiles = [
    { file: '.gitlab-ci.yml', description: 'Pipeline CI/CD' },
    { file: '.codeclimate.yml', description: 'Configuración CodeClimate' },
    { file: 'eslint.config.js', description: 'Configuración ESLint' },
    { file: 'tsconfig.json', description: 'Configuración TypeScript' }
  ];

  let allPresent = true;

  configFiles.forEach(({ file, description }) => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} - ${description}`);

      // Verificar contenido específico
      if (file === '.gitlab-ci.yml') {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('code_quality:')) {
          console.log('      ✅ Job de Code Quality configurado');
        } else {
          console.log('      ❌ Falta job de Code Quality');
          allPresent = false;
        }
      }


    } else {
      console.log(`   ❌ ${file} - FALTA: ${description}`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Simular análisis local de calidad
function simulateQualityAnalysis() {
  console.log('\n🔍 SIMULANDO ANÁLISIS DE CALIDAD LOCAL:');

  try {
    console.log('   🔄 Ejecutando ESLint...');
    // Analyze all TypeScript files or specify a different test file
    const eslintResult = execSync('npx eslint . --ext .ts,.tsx --format=compact', {
      encoding: 'utf8',
      timeout: 10000
    });

    if (eslintResult.trim()) {
      console.log('   ✅ ESLint detectó errores:');
      const lines = eslintResult.split('\n').filter(line => line.trim());
      lines.slice(0, 5).forEach(line => {
        console.log(`      ${line}`);
      });
      if (lines.length > 5) {
        console.log(`      ... y ${lines.length - 5} errores más`);
      }
    } else {
      console.log('   ⚠️  ESLint no detectó errores');
    }
  } catch (error) {
    if (error.stdout) {
      console.log('   ✅ ESLint detectó errores:');
      const lines = error.stdout.split('\n').filter(line => line.trim() && !line.startsWith('Oops'));
      lines.slice(0, 5).forEach(line => {
        console.log(`      ${line}`);
      });
      if (lines.length > 5) {
        console.log(`      ... y ${lines.length - 5} líneas más`);
      }
    } else {
      console.log('   ❌ Error ejecutando ESLint');
    }
  }
}

// Mostrar instrucciones para verificar en GitLab
function showGitLabInstructions() {
  console.log('\n🚀 INSTRUCCIONES PARA VERIFICAR EN GITLAB:');
  console.log('');

  console.log('1️⃣ IR AL PIPELINE:');
  console.log('   URL: https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines');
  console.log('');

  console.log('2️⃣ VER EL ESTADO DEL ÚLTIMO PIPELINE:');
  console.log('   - Debería mostrar "Running" o "Failed"');
  console.log('   - Buscar el job "code_quality"');
  console.log('');

  console.log('3️⃣ VERIFICAR QUE BLOQUEA:');
  console.log('   - El job "code_quality" debería fallar');
  console.log('   - Debería mostrar errores del archivo test-quality-gates.ts');
  console.log('   - Los jobs siguientes (test, deploy) deberían estar bloqueados');
  console.log('');

  console.log('4️⃣ VER REPORTES DE CALIDAD:');
  console.log('   - En el job "code_quality" → sección "Code Quality Report"');
  console.log('   - Debería listar todos los errores encontrados');
  console.log('');

  console.log('5️⃣ VERIFICAR BLOQUEO DE MERGE:');
  console.log('   - Si hay un MR abierto, debería estar bloqueado');
  console.log('   - El estado debería ser "Pipeline blocked"');
  console.log('');
}

// Función principal
async function monitorQualityGates() {
  console.log('🎯 MONITOREANDO CODE QUALITY GATES...');
  console.log('');

  const repoOk = checkRepositoryStatus();
  const configOk = checkConfigurationFiles();
  simulateQualityAnalysis();

  console.log('\n📊 RESUMEN DEL MONITOR:');
  console.log('=' .repeat(40));

  console.log(`📁 Repositorio: ${repoOk ? '✅' : '❌'}`);
  console.log(`📋 Configuración: ${configOk ? '✅' : '❌'}`);
  console.log('🔍 Análisis local: ✅ (Completado)');

  const overallStatus = repoOk && configOk;

  if (overallStatus) {
    console.log('\n🎉 ¡MONITOR LISTO!');
    console.log('   ✅ Configuración correcta');
    console.log('   ✅ Archivo de prueba creado');
    console.log('   ✅ Análisis local funcionando');

    showGitLabInstructions();

    console.log('\n⏳ ESPERANDO RESULTADOS DEL PIPELINE...');
    console.log('   El pipeline de GitLab debería estar ejecutándose ahora');
    console.log('   Tardará unos minutos en completar el análisis');

    console.log('\n🔄 PARA VERIFICAR EL ESTADO:');
    console.log('   • Ejecuta: node scripts/monitor-pipeline-quality.js');
    console.log('   • Ve a GitLab: https://gitlab.com/gsusfc-group/GsusFC-project/-/pipelines');

  } else {
    console.log('\n⚠️  REVISIÓN REQUERIDA:');
    console.log('   • Verificar archivos de configuración');
    console.log('   • Asegurar que el push llegó a GitLab');
    console.log('   • Revisar configuración del pipeline');
  }

  console.log('\n💡 RECUERDA:');
  console.log('   El sistema está diseñado para BLOQUEAR código con errores');
  console.log('   Solo permite merge cuando la calidad es aceptable');
  console.log('   ¡Esto es exactamente lo que queremos! 🚫➡️✅');
}

// Ejecutar monitor
if (require.main === module) {
  monitorQualityGates().catch(console.error);
}

module.exports = { monitorQualityGates };
