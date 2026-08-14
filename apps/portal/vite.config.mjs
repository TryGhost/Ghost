/* eslint-env node */
import pkg from './package.json';
import {publicAppViteConfig} from '../_shared/vite-public-app.mjs';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.jsx',
    cssCodeSplit: false,
    overrides: {
        define: {
            REACT_APP_VERSION: JSON.stringify(pkg.version)
        },
        resolve: {
            dedupe: ['@tryghost/debug']
        },
        test: {
            setupFiles: './test/setup-tests.js',
            coverage: {
                reporter: ['cobertura', 'text-summary', 'html']
            }
        }
    }
});
