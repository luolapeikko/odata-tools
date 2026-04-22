import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
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
