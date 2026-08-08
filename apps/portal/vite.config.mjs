/* eslint-env node */
import pkg from './package.json';
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.jsx',
    cssCodeSplit: false,
    overrides: {
        define: {
            // package.json only carries a real version in the publish job, which
            // sets it before building. Outside that, leave it null so the app
            // falls back to the version Ghost reports.
            REACT_APP_VERSION: JSON.stringify(pkg.version === '0.0.0' ? null : pkg.version)
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
