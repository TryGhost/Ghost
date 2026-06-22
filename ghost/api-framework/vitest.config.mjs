import {defineConfig} from 'vitest/config';

// Local config so `vitest run` in this package runs only its own tests rather
// than the monorepo root project list. Tests rely on globals (describe/it).
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.{js,ts}'],
        pool: 'threads'
    }
});
