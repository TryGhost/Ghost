import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
    // Exclude Playwright test directory from Vitest runs
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/test/acceptance/**' // Assuming your Playwright tests reside here
        ]
    }
});
