// 🔍 ESLint Configuration for FrameFuse
// Configuración de linting optimizada para proyecto TypeScript/Node.js

module.exports = {
  // Entorno de ejecución
  env: {
    browser: true,
    node: true,
    es2022: true,
    jest: true
  },

  // Extends - configuraciones base
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:node/recommended'
  ],

  // Parser para TypeScript
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },

  // Plugins
  plugins: [
    '@typescript-eslint',
    'import',
    'node',
    'security'
  ],

  // Configuración global
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      },
      node: {
        extensions: ['.js', '.ts', '.tsx', '.json']
      }
    }
  },

  // Reglas personalizadas para FrameFuse
  rules: {
    // TypeScript - Errores críticos
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // Import/Export
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always'
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',

    // Node.js
    'node/no-missing-import': 'off', // Dejado para TypeScript
    'node/no-unsupported-features/es-syntax': 'off',
    'node/shebang': 'error',

    // Seguridad
    'security/detect-object-injection': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',

    // Mejores prácticas generales
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error'
  },

  // Configuración específica por directorios
  overrides: [
    // Archivos de configuración
    {
      files: [
        '*.config.js',
        '*.config.ts',
        'vite.config.*',
        'vitest.config.*'
      ],
      rules: {
        'node/no-missing-import': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    },

    // Scripts de automatización
    {
      files: [
        'scripts/**/*.js',
        'scripts/**/*.ts'
      ],
      rules: {
        'node/shebang': 'off',
        'no-console': 'off',
        'security/detect-child-process': 'warn'
      }
    },

    // Tests
    {
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx'
      ],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'node/no-missing-import': 'off'
      }
    },

    // API Backend
    {
      files: [
        'api/**/*.ts',
        'api/**/*.js'
      ],
      rules: {
        'no-console': 'off', // Permitir logs en backend
        'security/detect-object-injection': 'error'
      }
    },

    // Packages locales
    {
      files: [
        'packages/**/*.ts',
        'packages/**/*.tsx'
      ],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'warn'
      }
    }
  ],

  // Variables globales
  globals: {
    // Browser APIs
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    console: 'readonly',

    // Node.js
    process: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',

    // Web APIs para tests
    fetch: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    Headers: 'readonly'
  },

  // Ignorar archivos
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.next/',
    '.nuxt/',
    '*.min.js',
    '*.bundle.js'
  ]
};
