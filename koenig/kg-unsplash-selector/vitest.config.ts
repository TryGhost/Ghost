import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
    // Exclude Playwright test directory from Vitest runs
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/test/acceptance/**' // Assuming your Playwright tests reside here
        ],
        coverage: {
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/test/**',
                // anything that is tsx and not inside src/api
                
                '**/*.tsx'
            ],
            include: [
                '**/src/api/**'
            ]
        }
    }
});
