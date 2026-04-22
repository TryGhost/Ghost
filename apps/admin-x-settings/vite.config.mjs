import adminXViteConfig from '@tryghost/admin-x-framework/vite';
import pkg from './package.json';
import {resolve} from 'path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

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
                    '@src': resolve(__dirname, 'src'),
                    '@test': resolve(__dirname, 'test'),
                    fs: 'node-shim.cjs',
                    path: 'node-shim.cjs',
                    util: 'node-shim.cjs',
                    // @TODO: Remove this when @tryghost/nql is updated
                    mingo: require.resolve('mingo/dist/mingo.js')
                }
            },
            optimizeDeps: {
                include: ['@tryghost/kg-unsplash-selector', '@tryghost/custom-fonts']
            }
        },
        build: {
            commonjsOptions: {
                include: [/ghost\/custom-fonts/]
            }
        }
    });
});
