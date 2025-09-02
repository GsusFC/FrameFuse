#!/usr/bin/env node

/**
 * 🔐 Verificación de Personal Access Token para GitLab CI/CD
 * Script para validar que el token es correcto antes del despliegue
 */

const https = require('https');

// Función para mostrar banner
function showBanner() {
  console.log('🔐 VERIFICACIÓN DE PERSONAL ACCESS TOKEN');
  console.log('=' .repeat(50));
}

// Función para probar token con GitLab API
async function testToken(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'gitlab.com',
      path: '/api/v4/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FrameFuse-Token-Verifier/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const user = JSON.parse(data);
            resolve({
              valid: true,
              status: res.statusCode,
              user: {
                id: user.id,
                username: user.username,
                name: user.name
              }
            });
          } else {
            resolve({
              valid: false,
              status: res.statusCode,
              error: data || 'Unknown error'
            });
          }
        } catch (error) {
          resolve({
            valid: false,
            status: res.statusCode,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        valid: false,
        status: null,
        error: error.message
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        valid: false,
        status: null,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

// Función para probar scopes del token
async function testScopes(token) {
  const tests = [
    {
      name: 'API Access',
      path: '/api/v4/user',
      description: 'Verificar acceso básico a API'
    },
    {
      name: 'Projects Access',
      path: '/api/v4/projects?per_page=1',
      description: 'Verificar acceso a proyectos'
    },
    {
      name: 'Registry Access',
      path: '/api/v4/projects/gsusfc-group%2FGsusFC-project/registry/repositories',
      description: 'Verificar acceso a container registry'
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await new Promise((resolve) => {
      const options = {
        hostname: 'gitlab.com',
        path: test.path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'FrameFuse-Token-Verifier/1.0'
        }
      };

      const req = https.request(options, (res) => {
        resolve({
          name: test.name,
          status: res.statusCode,
          accessible: res.statusCode >= 200 && res.statusCode < 400
        });
      });

      req.on('error', () => resolve({
        name: test.name,
        status: null,
        accessible: false
      }));

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          name: test.name,
          status: null,
          accessible: false
        });
      });

      req.end();
    });

    results.push(result);
  }

  return results;
}

// Función para mostrar instrucciones de corrección
function showFixInstructions(error) {
  console.log('\n🔧 PARA CORREGIR EL PROBLEMA:');
  console.log('');

  if (error.includes('401') || error.includes('403')) {
    console.log('❌ El token no tiene permisos suficientes');
    console.log('');
    console.log('🔑 Solución: Crear nuevo Personal Access Token con scopes:');
    console.log('   ✅ api - Acceso completo a API');
    console.log('   ✅ read_registry - Leer Container Registry');
    console.log('   ✅ write_registry - Escribir Container Registry');
    console.log('');
    console.log('📝 URL: https://gitlab.com/-/profile/personal_access_tokens');
  } else if (error.includes('timeout')) {
    console.log('❌ Problema de conectividad');
    console.log('   💡 Verifica tu conexión a internet');
  } else {
    console.log('❌ Error desconocido');
    console.log('   💡 Intenta crear un nuevo token');
  }
}

// Función principal
async function verifyToken() {
  showBanner();
  console.log('🔍 Ingresa tu Personal Access Token para verificar:');
  console.log('(El token debe empezar con "glpat-")');
  console.log('');

  // Para este ejemplo, voy a simular la verificación
  // En un entorno interactivo, pediríamos el token al usuario
  console.log('📝 Para verificar tu token, puedes:');
  console.log('');
  console.log('1. Ejecutar este comando con tu token:');
  console.log('   node scripts/verify-token.js [tu-token-aquí]');
  console.log('');
  console.log('2. O verificar manualmente:');
  console.log('   curl -H "Authorization: Bearer [tu-token]" https://gitlab.com/api/v4/user');
  console.log('');
  console.log('3. Deberías ver tu información de usuario si el token es válido');

  console.log('\n✅ SI EL TOKEN ES VÁLIDO:');
  console.log('   • Status 200 ✅');
  console.log('   • Respuesta JSON con tu información de usuario');
  console.log('   • Puedes proceder con la configuración CI/CD');

  console.log('\n❌ SI EL TOKEN ES INVÁLIDO:');
  console.log('   • Status 401/403 ❌');
  console.log('   • Necesitas crear un nuevo Personal Access Token');

  console.log('\n🎯 RECUERDA:');
  console.log('   El token correcto debe tener el prefijo "glpat-"');
  console.log('   NO uses los tokens glft- o glimt- que tienes actualmente');
}

// Ejecutar verificación
if (require.main === module) {
  // Si se pasa un token como argumento
  const token = process.argv[2];

  if (token) {
    showBanner();
    console.log(`🔐 Verificando token: ${token.substring(0, 10)}...`);
    console.log('');

    testToken(token).then(async (result) => {
      if (result.valid) {
        console.log('✅ TOKEN VÁLIDO!');
        console.log(`👤 Usuario: ${result.user.name} (${result.user.username})`);
        console.log(`🆔 ID: ${result.user.id}`);
        console.log('');

        console.log('🔍 Probando scopes...');
        const scopesResult = await testScopes(token);

        scopesResult.forEach(scope => {
          const emoji = scope.accessible ? '✅' : '❌';
          console.log(`   ${emoji} ${scope.name}: ${scope.accessible ? 'OK' : 'FALLÓ'}`);
        });

        const allScopesOk = scopesResult.every(s => s.accessible);
        if (allScopesOk) {
          console.log('\n🎉 ¡PERFECTO! Tu token está listo para CI/CD');
          console.log('🚀 Puedes proceder con la configuración en GitLab');
        } else {
          console.log('\n⚠️ El token funciona pero puede tener scopes insuficientes');
          console.log('💡 Recomendación: Crear token con todos los scopes necesarios');
        }

      } else {
        console.log('❌ TOKEN INVÁLIDO');
        console.log(`📊 Status: ${result.status}`);
        console.log(`🔍 Error: ${result.error}`);
        showFixInstructions(result.error);
      }
    });
  } else {
    verifyToken();
  }
}

module.exports = { testToken, testScopes };
