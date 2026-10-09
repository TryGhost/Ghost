import pkg from './package.json';
import { publicAppViteConfig } from '@internal/cfg-vite-public-app';
import { stripFingerprintingPlugin } from './vite-plugin-strip-fingerprinting';

export default publicAppViteConfig({
  packageRoot: import.meta.dirname,
  packageName: pkg.name,
  entry: 'src/index.tsx',
  framework: 'preact',
  svgr: false,
  sourcemap: false,
  overrides: {
    plugins: [stripFingerprintingPlugin()],
    define: {
      'process.env.VITEST_SEGFAULT_RETRY': 3,
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true, // allows domain-name proxies to the preview server
      port: 7173,
      cors: true,
    },
    server: {
      port: 5368,
    },
    resolve: {
      dedupe: ['@tryghost/debug'],
    },
    test: {
      setupFiles: './src/setup-tests.ts',
      include: ['test/unit/**/*.test.{js,jsx,ts,tsx}'],
      testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
      // Inlined so it shares the app's Vite-resolved preact instance
      server: {
        deps: {
          inline: ['@testing-library/preact'],
        },
      },
      ...(process.env.CI && {
        // https://github.com/vitest-dev/vitest/issues/1674
        minThreads: 1,
        maxThreads: 2,
      }),
    },
  },
});
