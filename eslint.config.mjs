import _import from 'eslint-plugin-import';
import chaiExpect from 'eslint-plugin-chai-expect';
import chaiFriendly from 'eslint-plugin-chai-friendly';
import globals from 'globals';
import js from '@eslint/js';
import mochaNoOnly from 'eslint-plugin-mocha-no-only';
import path from 'node:path';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { defineConfig } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const baseConfigRules = fixupConfigRules(
  compat.extends(
    'airbnb',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
  )
);

export default defineConfig([{
  extends: baseConfigRules,
  languageOptions: {
    ecmaVersion: 5,
    parser: tsParser,
    sourceType: 'module',
    globals: {
      ...globals.applescript,
      ...globals.chai,
      ...globals.mocha
    }
  },
  plugins: {
    import: fixupPluginRules(_import),
    '@typescript-eslint': fixupPluginRules(typescriptEslint),
    'chai-expect': chaiExpect,
    'chai-friendly': chaiFriendly,
    'mocha-no-only': mochaNoOnly
  },
  rules: {
    eqeqeq: ['error', 'always'],
    indent: ['error', 2],
    quotes: ['error', 'single'],
    semi: ['error'],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-empty-interface': ['error', { allowSingleExtends: true }],
    '@typescript-eslint/no-explicit-any': 2,
    '@typescript-eslint/no-shadow': 2,
    '@typescript-eslint/no-unused-expressions': 0,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'arrow-body-style': 'off',
    'arrow-parens': 0,
    'chai-friendly-/no-unused-expressions': 0,
    'class-methods-use-this': 'off',
    'func-names': ['error', 'never'],
    'func-style': ['error', 'expression'],
    'import/newline-after-import': ['error', { count: 1 }],
    'import/no-duplicates': 'error',
    'import/prefer-default-export': 'off',
    'lines-between-class-members': 'off',
    'max-classes-per-file': 'off',
    'mocha-no-only/mocha-no-only': ['error'],
    'no-console': 'warn',
    'no-multi-spaces': 'error',
    'no-shadow': 'off',
    'no-trailing-spaces': 'error',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 0,
    'no-use-before-define': 'warn',
    'object-shorthand': ['error', 'always', { avoidQuotes: true }],
    'prefer-rest-params': 'off',
    'comma-dangle': [
      'error',
      {
        arrays: 'never',
        exports: 'never',
        functions: 'never',
        imports: 'never',
        objects: 'never'
      }
    ],

    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        json: 'never',
        ts: 'never'
      }
    ],
    'max-len': [
      'error',
      100,
      2,
      {
        ignoreComments: false,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true
      }
    ],
    'no-multiple-empty-lines': [
      'error',
      {
        max: 1,
        maxBOF: 0,
        maxEOF: 1
      }
    ]

  },
  settings: {
    'import/resolver': { typescript: { alwaysTryTypes: true } }
  }
}]);
