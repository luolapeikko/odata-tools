import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['minimal', 'github-actions'],
		globals: true,
		environment: 'node',
		include: ['**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcovonly'],
			include: ['**/*.ts'],
			exclude: ['**/dist/**', '**/*-d.ts'],
		},
		typecheck: {
			include: ['**/*.test-d.ts'],
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
});
