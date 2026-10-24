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
    // Pin the env vars the app reads so tests don't depend on whatever the
    // developer's local .env happens to contain (or on it existing at all --
    // CI and fresh clones have none). MSW handlers build their URLs from the
    // same import.meta.env values, so any non-empty origin works.
    env: {
      VITE_API_URL: 'https://api.test',
      VITE_CHAT_URL: 'https://chat.test/chat',
    },
    // Vitest's default excludes don't skip .worktrees -- a worktree ever
    // created nested inside website/ (e.g. via a relative `git worktree add`
    // run from the wrong cwd) contains a full copy of every test file,
    // which Vitest then double-discovers and runs alongside the real ones.
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
});
