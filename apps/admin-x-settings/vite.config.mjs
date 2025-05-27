import adminXViteConfig from '@tryghost/admin-x-framework/vite';
import pkg from './package.json';
import {resolve} from 'path';

// https://vitejs.dev/config/
export default (function viteConfig() {
    return adminXViteConfig({
        packageName: pkg.name,
        entry: resolve(__dirname, 'src/index.tsx'),
        overrides: {
            define: {
                'process.env.DEBUG': false // Shim env var utilized by the @tryghost/nql package
            },
            resolve: {
                // Shim node modules utilized by the @tryghost/nql package
                alias: {
                    fs: resolve(__dirname, 'node-shim.cjs'),
                    path: resolve(__dirname, 'node-shim.cjs'),
                    util: resolve(__dirname, 'node-shim.cjs'),
                    // @TODO: Remove this when @tryghost/nql is updated
                    mingo: resolve(__dirname, '../../node_modules/mingo/dist/mingo.js')
                }
            },
            optimizeDeps: {
                include: ['@tryghost/kg-unsplash-selector', '@tryghost/custom-fonts']
            },
            test: {
                globals: true,
                environment: 'jsdom',
                include: ['test/unit/**/*.test.ts'],
                exclude: ['test/acceptance/**/*']
            }
        },
        build: {
            commonjsOptions: {
                include: [/ghost\/custom-fonts/]
            }
        }
    });
});
