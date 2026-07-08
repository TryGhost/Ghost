import {resolve} from 'path';
import pkg from './package.json';
import {publicAppViteConfig} from '../_shared/vite-public-app.mjs';
import {stripFingerprintingPlugin} from './vite-plugin-strip-fingerprinting';

export default publicAppViteConfig({
    packageRoot: import.meta.dirname,
    packageName: pkg.name,
    entry: 'src/index.tsx',
    sourcemap: false,
    overrides: {
        plugins: [stripFingerprintingPlugin()],
        define: {
            'process.env.VITEST_SEGFAULT_RETRY': 3
        },
        preview: {
            host: '0.0.0.0',
            allowedHosts: true, // allows domain-name proxies to the preview server
            port: 7173,
            cors: true
        },
        server: {
            port: 5368
        },
        resolve: {
            // comments-ui uses React 17 while the monorepo hoists React 18;
            // dedupe + alias ensures all deps (including @tiptap/react) use
            // the same React 17 instance from comments-ui's node_modules
            dedupe: ['react', 'react-dom', '@tryghost/debug'],
            alias: {
                react: resolve(import.meta.dirname, 'node_modules/react'),
                'react-dom': resolve(import.meta.dirname, 'node_modules/react-dom')
            }
        },
        test: {
            setupFiles: './src/setup-tests.ts',
            include: ['test/unit/**/*.test.{js,jsx,ts,tsx}'],
            testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
            server: {
                deps: {
                    // Inline all deps so Vite's resolve.alias applies to their
                    // React imports (prevents duplicate React 17 instances when
                    // the monorepo hoists React 18)
                    inline: [/@tiptap/, /@headlessui/]
                }
            },
            ...(process.env.CI && { // https://github.com/vitest-dev/vitest/issues/1674
                minThreads: 1,
                maxThreads: 2
            })
        }
    }
});
