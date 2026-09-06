import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Vitest's default excludes don't skip .worktrees -- a worktree ever
    // created nested inside website/ (e.g. via a relative `git worktree add`
    // run from the wrong cwd) contains a full copy of every test file,
    // which Vitest then double-discovers and runs alongside the real ones.
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
});
