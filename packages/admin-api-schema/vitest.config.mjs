import {createVitestConfig} from '@internal/cfg-vitest';

export default createVitestConfig({
    test: {
        include: ['test/**/*.test.ts'],
        globals: true,
        coverage: {
            include: ['index.js']
        }
    }
});
