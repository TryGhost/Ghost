import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import pkg from './package.json';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import {PluginOption} from 'vite';
import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

const outputFileName = pkg.name[0] === '@' ? pkg.name.slice(pkg.name.indexOf('/') + 1) : pkg.name;

const externalPlugin = ({externals}: { externals: Record<string, string> }): PluginOption => {
    return {
        name: 'external-globals',
        apply: 'build',
        enforce: 'pre',
        resolveId(id) {
            if (Object.keys(externals).includes(id)) {
                // Naming convention for IDs that will be resolved by a plugin
                return `\0${id}`;
            }
        },
        async load(id) {
            const [originalId, externalName] = Object.entries(externals).find(([key]) => id === `\0${key}`) || [];

            if (originalId) {
                const module = await import(originalId);

                return Object.keys(module).map(key => (key === 'default' ? `export default ${externalName};` : `export const ${key} = ${externalName}.${key};`)).join('\n');
            }
        }
    };
};

// https://vitejs.dev/config/
export default (function viteConfig() {
    return defineConfig({
        plugins: [
            svgr(),
            react(),
            externalPlugin({
                externals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                }
            }),
            cssInjectedByJsPlugin()
        ],
        define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'process.env.VITEST_SEGFAULT_RETRY': 3,
            'process.env.DEBUG': false // Shim env var utilized by the @tryghost/nql package
        },
        preview: {
            port: 4174
        },
        build: {
            minify: true,
            sourcemap: true,
            lib: {
                formats: ['es'],
                entry: resolve(__dirname, 'src/index.tsx'),
                name: pkg.name,
                fileName(format) {
                    if (format === 'umd') {
                        return `${outputFileName}.umd.js`;
                    }

                    return `${outputFileName}.js`;
                }
            },
            commonjsOptions: {
                include: [/packages/, /node_modules/]
            }
        },
        test: {
            globals: true, // required for @testing-library/jest-dom extensions
            environment: 'jsdom',
            include: ['./test/unit/**/*'],
            testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
            ...(process.env.CI && { // https://github.com/vitest-dev/vitest/issues/1674
                minThreads: 1,
                maxThreads: 2
            })
        },
        resolve: {
            // Shim node modules utilized by the @tryghost/nql package
            alias: {
                fs: 'node-shim.cjs',
                path: 'node-shim.cjs',
                util: 'node-shim.cjs',
                // @TODO: Remove this when @tryghost/nql is updated
                mingo: resolve(__dirname, '../../node_modules/mingo/dist/mingo.js')
            }
        }
    });
});
