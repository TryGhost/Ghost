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
