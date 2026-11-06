// C9 / #54 — ESLint 9 flat config (lint gate, complements the vue-tsc type check
// in `npm run lint`). Scoped to product code; test specs get their own policy
// (see ignores). lenient-but-meaningful: real-bug rules stay `error`, style
// noise downgrades to `warn` so the gate passes now and still catches regressions.
//
// Key gotcha (why this wiring): `eslint-plugin-vue`'s flat config does NOT
// auto-wire `vue-eslint-parser` to delegate the <script lang="ts"> block to the
// TS parser, so a bare flat config fails to parse .vue and the whole run errors.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  {
    ignores: [
      'dist', 'node_modules', 'coverage', 'legacy', 'scripts', '.git',
      'public', 'test-results', 'tests', '*.config.*', 'eslint.config.js',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // style noise -> warn (gate still passes, report still flags it)
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-unused-vars': 'off',
      // intentional single-file <script setup> components
      'vue/multi-word-component-names': 'off',
      // intentional compact button-grid style — these fight single-line keys.
      // error-catching rules above stay on; we only silence the compact-grid noise.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/attributes-order': 'off',
    },
  },
)
