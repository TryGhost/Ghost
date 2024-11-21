import adminXViteConfig from '@tryghost/admin-x-framework/vite';
import pkg from './package.json';
import {resolve} from 'path';

export default (function viteConfig() {
    return adminXViteConfig({
        packageName: pkg.name,
        entry: resolve(__dirname, 'src/index.tsx'),
        overrides: {
            test: {
                include: [
                    './test/unit/**/*',
                    './src/**/*.test.ts'
                ]
            }
        }
    });
});
