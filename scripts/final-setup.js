#!/usr/bin/env node

/**
 * 🎯 FrameFuse - Configuración Final Automática
 * Completa la configuración una vez que tienes el token
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎯 FRAMEFUSE - CONFIGURACIÓN FINAL');
console.log('=' .repeat(50));

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('📋 Estado Actual:');
  console.log('• ✅ Personal Access Token creado');
  console.log('• ⏳ Variables CI/CD pendientes');
  console.log('• ⏳ GitLab Duo pendiente');
  console.log('• ⏳ Container Registry pendiente');
  console.log('');

  // Pedir el token
  const token = await askQuestion('🔑 Pega tu Personal Access Token (glpat-...): ');

  if (!token || !token.startsWith('glpat-')) {
    console.log('❌ Token inválido. Debe empezar con "glpat-"');
    rl.close();
    return;
  }

  console.log('✅ Token recibido, verificando...');

  // Verificar token
  try {
    const result = execSync(`node scripts/verify-token.js "${token}"`, {
      encoding: 'utf8',
      timeout: 10000
    });

    if (result.includes('✅ TOKEN VÁLIDO')) {
      console.log('🎉 ¡Token verificado correctamente!');
    } else {
      console.log('❌ Token inválido o sin permisos suficientes');
      rl.close();
      return;
    }
  } catch (error) {
    console.log('❌ Error al verificar token:', error.message);
    rl.close();
    return;
  }

  console.log('');
  console.log('🚀 CONFIGURACIÓN COMPLETA - PRÓXIMOS PASOS:');
  console.log('');

  console.log('1️⃣ COPIA ESTA INFORMACIÓN PARA GITLAB:');
  console.log('');
  console.log('   📋 Variable CI/CD:');
  console.log('   • Key: CI_REGISTRY_PASSWORD');
  console.log('   • Value:', token);
  console.log('   • ✅ Protect variable');
  console.log('   • ✅ Mask variable');
  console.log('');

  console.log('2️⃣ URLs A VISITAR:');
  console.log('');
  console.log('   🔗 Variables CI/CD:');
  console.log('   https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/ci_cd');
  console.log('');
  console.log('   🤖 GitLab Duo:');
  console.log('   https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/gitlab_duo');
  console.log('');
  console.log('   🐳 Container Registry:');
  console.log('   https://gitlab.com/gsusfc-group/GsusFC-project/-/settings/general');
  console.log('');

  console.log('3️⃣ VERIFICACIÓN FINAL:');
  console.log('');
  console.log('   Después de configurar todo, ejecuta:');
  console.log('   node scripts/post-deployment-check.js');
  console.log('');

  console.log('🎊 ¡UNA VEZ CONFIGURADO:');
  console.log('');
  console.log('   • El pipeline se ejecutará automáticamente');
  console.log('   • Podrás usar GitLab Duo Chat:');
  console.log('     "Analiza el rendimiento del pipeline"');
  console.log('     "¿Cómo optimizar el build de Docker?"');
  console.log('     "Revisa vulnerabilidades del registry"');
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 ¿Ya configuraste las variables en GitLab?');

  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}
