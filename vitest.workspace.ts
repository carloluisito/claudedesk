import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@shared': resolve(__dirname, 'src/shared') },
  },
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          include: ['src/shared/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'main',
          include: ['src/main/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['test/setup-main.ts'],
        },
      },
      {
        test: {
          name: 'renderer',
          root: '.',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['test/setup-renderer.ts'],
        },
      },
    ],
  },
});
