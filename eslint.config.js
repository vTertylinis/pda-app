const angular = require('@angular-eslint/eslint-plugin');
const templates = require('@angular-eslint/eslint-plugin-template');
const tsParser = require('@typescript-eslint/parser');
const templateParser = require('@angular-eslint/template-parser');
const recommended = (plugin, prefix) => Object.fromEntries(
  Object.entries(plugin.rules).filter(([, rule]) => rule.meta.docs.recommended)
    .map(([name]) => [`${prefix}/${name}`, 'error'])
);

module.exports = [
  { ignores: ['node_modules/**', 'www/**', 'android/**', '.angular/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser },
    plugins: { '@angular-eslint': angular, '@angular-eslint/template': templates },
    processor: templates.processors['extract-inline-html'],
    rules: {
      ...recommended(angular, '@angular-eslint'),
      '@angular-eslint/prefer-standalone': 'off',
      // The v22 migration explicitly preserves eager detection in the app shell
      // and prompt host; feature components already use OnPush.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Page', 'Component'] }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }]
    }
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@angular-eslint/template': templates },
    rules: { ...recommended(templates, '@angular-eslint/template') }
  }
];
