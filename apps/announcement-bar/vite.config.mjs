/* eslint-env node */
import pkg from './package.json';
import { publicAppViteConfig } from '@internal/cfg-vite-public-app';

export default publicAppViteConfig({
  packageRoot: import.meta.dirname,
  packageName: pkg.name,
  entry: 'src/index.tsx',
  framework: 'preact',
  svgr: false,
  sourcemap: false,
  overrides: {
    test: {
      include: ['test/unit/**/*.test.{ts,tsx}'],
    },
  },
});
