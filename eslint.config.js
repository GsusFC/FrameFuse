// 🔍 ESLint Configuration for FrameFuse (ESLint v9)
// Configuración de linting optimizada para proyecto TypeScript/Node.js

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  // Configuración base recomendada
  js.configs.recommended,

  // Configuración TypeScript
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin
    },
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

      // Mejores prácticas generales
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error'
    }
  },

  // Configuración JavaScript
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },

  // Configuración específica por directorios
  {
    // Archivos de configuración
    files: [
      '*.config.js',
      '*.config.ts',
      'vite.config.*',
      'vitest.config.*'
    ],
    rules: {
      'no-console': 'off'
    }
  },

  {
    // Scripts de automatización
    files: [
      'scripts/**/*.js',
      'scripts/**/*.ts'
    ],
    rules: {
      'no-console': 'off'
    }
  },

  {
    // Tests
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
        jest: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },

  {
    // API Backend
    files: [
      'api/**/*.ts',
      'api/**/*.js'
    ],
    rules: {
      'no-console': 'off' // Permitir logs en backend
    }
  },

  {
    // Packages locales
    files: [
      'packages/**/*.ts',
      'packages/**/*.tsx'
    ],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'warn'
    }
  },

  // Exclusiones globales
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.next/',
      '.nuxt/',
      '*.min.js',
      '*.bundle.js',
      '**/*.d.ts'
    ]
  }
];
