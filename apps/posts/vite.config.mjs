import adminXViteConfig from '@tryghost/admin-x-framework/vite';
import pkg from './package.json';
import {resolve} from 'path';
import {defineConfig} from 'vitest/config';

export default defineConfig((function viteConfig() {
    return adminXViteConfig({
        packageName: pkg.name,
        entry: resolve(__dirname, 'src/index.tsx'),
        overrides: {
            test: {
                globals: true,
                environment: 'jsdom',
                setupFiles: './test/setup-tests.js',
                include: [
                    './test/unit/**/*{.spec,.test}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
                    './src/**/?(*.){spec,test}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
                ]
            },
            resolve: {
                alias: {
                    '@src': resolve(__dirname, './src'),
                    '@assets': resolve(__dirname, './src/assets'),
                    '@components': resolve(__dirname, './src/components'),
                    '@hooks': resolve(__dirname, './src/hooks'),
                    '@utils': resolve(__dirname, './src/utils'),
                    '@views': resolve(__dirname, './src/views')
                }
            }
        }
    });
}));
