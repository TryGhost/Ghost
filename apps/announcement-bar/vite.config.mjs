/* eslint-env node */
import pkg from './package.json';
import {publicAppViteConfig} from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.jsx',
    sourcemap: false,
    overrides: {
        test: {
            setupFiles: './test/setup-tests.js'
        }
    }
});
