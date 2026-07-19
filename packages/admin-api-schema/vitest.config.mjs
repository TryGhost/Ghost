import {createVitestConfig} from '@internal/cfg-vitest';

export default createVitestConfig({
    test: {
        include: ['test/**/*.test.js'],
        globals: true,
        coverage: {
            include: ['index.js', 'lib/**/*.js'],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 80,
                statements: 100
            }
        }
    }
});
