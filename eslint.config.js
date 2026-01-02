import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	{
		ignores: ['node_modules/', 'dist/', 'build/', 'public/']
	},

	// frontend
	{
		files: ['src/**/*.{js,mjs,cjs}'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: { globals: globals.browser }
	},

	// backend
	{
		files: ['**/*.{js,mjs,cjs}'],
		ignores: ['src/**'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: { globals: globals.node }
	},
	prettierConfig
]);
