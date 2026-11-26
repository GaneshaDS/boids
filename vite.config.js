import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /boids/; local dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/boids/' : '/',
  plugins: [vue(), tailwindcss()],
}));
