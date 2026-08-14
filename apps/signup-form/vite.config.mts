import pkg from './package.json';
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.tsx',
    sourcemap: false,
    overrides: {
        define: {
            'process.env.VITEST_SEGFAULT_RETRY': 3
        },
        preview: {
            host: '0.0.0.0',
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 6174
        },
        optimizeDeps: {
            include: ['@tryghost/i18n', '@tryghost/debug']
        },
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        build: {
            rollupOptions: {
                output: {}
            }
        }
    }
});
