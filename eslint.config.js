// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Regras do projeto: sem `any`, sem `@ts-ignore`, sem console.log esquecido.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Textos sempre pelos componentes do tema (cor, tipografia e limite de 130%).
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['src/components/ui/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text', 'TextInput'],
              allowTypeImports: true,
              message: 'Use Text ou TextField de @/components/ui.',
            },
          ],
        },
      ],
    },
  },
]);
