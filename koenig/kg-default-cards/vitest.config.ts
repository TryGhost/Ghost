import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // Installs the `should` and `sinon` globals that the mocha suite
        // previously wired up via the same overrides module.
        setupFiles: ['./test/utils/overrides.ts', './test/utils/assertions.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'cobertura'],
            include: ['src/**'],
            all: true
        }
    }
});
