import {createVitestConfig} from '@internal/cfg-vitest';

export default createVitestConfig({
    test: {
        include: ['test/**/*.test.js'],
        globals: true,
        coverage: {
            include: ['index.js', 'lib/**/*.js']
        }
    }
});
