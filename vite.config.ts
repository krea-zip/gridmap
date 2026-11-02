import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// unit tests run through the same plugin as the app, so $lib and svelte
	// runes resolve exactly as they do in the browser
	test: {
		include: ['tests/**/*.test.{mjs,ts}'],
		environment: 'node'
	}
});
