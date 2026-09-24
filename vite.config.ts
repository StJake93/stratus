import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Relative base so the build works on GitHub Pages under /<repo>/ and locally.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  // Pre-bundle the lazily-loaded canvas deps so dev never does a mid-session reload.
  optimizeDeps: { include: ['@xyflow/svelte'] },
  build: { target: 'es2022', cssCodeSplit: true }
});
