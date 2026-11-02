import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ...js.configs.recommended,
    files: ['**/*.ts']
  },
  ...tsPlugin.configs['flat/recommended']
];
