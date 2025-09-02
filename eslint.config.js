// 🔍 ESLint Configuration for FrameFuse
// Configuración simplificada y compatible con ESLint v9

module.exports = [
  // Configuración base recomendada
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly'
      }
    },
    rules: {
      // Reglas básicas de JavaScript
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // Reglas de seguridad
      'no-eval': 'error',

      // Mejores prácticas
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'semi': ['error', 'always']
    }
  },

  // Configuración para archivos de configuración
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'vite.config.*',
      'vitest.config.*',
      'scripts/**/*.js'
    ],
    rules: {
      'no-console': 'off'
    }
  },

  // Configuración para tests
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        test: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },

  // Configuración para API
  {
    files: [
      'api/**/*.ts',
      'api/**/*.js'
    ],
    rules: {
      'no-console': 'off' // Permitir logs en backend
    }
  },

  // Exclusiones
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      '.nuxt/**',
      '*.min.js',
      '*.bundle.js',
      '**/*.d.ts',
      'test-quality-gates.ts' // Excluir archivo de prueba
    ]
  }
];
