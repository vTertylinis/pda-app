import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    server: {
      // Ionic's Stencil loader needs Vite's module resolution in Node tests.
      deps: { inline: [/@ionic\//] },
    },
  },
});
