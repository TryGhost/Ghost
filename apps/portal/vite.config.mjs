/* eslint-env node */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import pkg from './package.json';
import { publicAppViteConfig } from '@internal/cfg-vite-public-app';
import { countryFlagsPlugin } from './vite-plugin-country-flags';

const require = createRequire(import.meta.url);

export default publicAppViteConfig({
  packageRoot: import.meta.dirname,
  packageName: pkg.name,
  entry: 'src/index.jsx',
  cssCodeSplit: false,
  overrides: {
    plugins: [
      countryFlagsPlugin(join(dirname(require.resolve('country-flag-icons/package.json')), '3x2')),
    ],
    define: {
      REACT_APP_VERSION: JSON.stringify(pkg.version),
    },
    resolve: {
      dedupe: ['@tryghost/debug'],
    },
    test: {
      setupFiles: './test/setup-tests.ts',
      coverage: {
        reporter: ['cobertura', 'text-summary', 'html'],
      },
    },
  },
});
