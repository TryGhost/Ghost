/* eslint-env node */
import pkg from './package.json';
import {publicAppViteConfig} from '../_shared/vite-public-app.mjs';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.jsx',
    i18nNamespace: 'search',
    sourcemap: false,
    cssCodeSplit: false,
    overrides: {
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        build: {
            rollupOptions: {
                output: {
                    // Theme templates reference umd/main.css by name (see
                    // ghost/core defaults.json → sodoSearch.styles), so the
                    // CSS sibling emitted by Vite must keep that filename.
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                            return 'main.css';
                        }
                        return 'assets/[name]-[hash][extname]';
                    }
                }
            }
        },
        test: {
            setupFiles: './test/setup-tests.js'
        }
    }
});
