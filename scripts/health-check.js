#!/usr/bin/env node

/**
 * 💚 Health Check Script para Docker HEALTHCHECK
 * Verifica que la API de FrameFuse esté funcionando correctamente
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const TIMEOUT = 3000; // 3 segundos timeout

function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.status === 'ok') {
            console.log('✅ Health check passed:', response.message || 'API is healthy');
            resolve(true);
          } else {
            console.error('❌ Health check failed: Invalid response', {
              statusCode: res.statusCode,
              response: response
            });
            reject(new Error(`Health check failed: ${res.statusCode}`));
          }
        } catch (error) {
          console.error('❌ Health check failed: Invalid JSON response', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Health check failed: Connection error', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Health check failed: Timeout after', TIMEOUT, 'ms');
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
}

// Ejecutar health check si se llama directamente
if (require.main === module) {
  console.log('🔍 Ejecutando health check...');
  console.log(`📍 Verificando: http://${HOST}:${PORT}/health`);
  
  healthCheck()
    .then(() => {
      console.log('🎉 Health check exitoso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Health check falló:', error.message);
      process.exit(1);
    });
}

module.exports = { healthCheck };

