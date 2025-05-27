import react from '@vitejs/plugin-react';
import {Plugin, UserConfig, mergeConfig, defineConfig} from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import svgr from 'vite-plugin-svgr';

const externalPlugin = ({externals}: { externals: Record<string, string> }): Plugin => {
    return {
        name: 'external-globals',
        apply: 'build',
        enforce: 'pre',
        resolveId(id: string) {
            if (Object.keys(externals).includes(id)) {
                // Naming convention for IDs that will be resolved by a plugin
                return `\0${id}`;
            }
        },
        async load(id: string) {
            const [originalId, externalName] = Object.entries(externals).find(([key]) => id === `\0${key}`) || [];

            if (originalId) {
                const module = await import(originalId);

                return Object.keys(module).map(key => (key === 'default' ? `export default ${externalName};` : `export const ${key} = ${externalName}.${key};`)).join('\n');
            }
        }
    };
};

// https://vitejs.dev/config/
export default function adminXViteConfig({packageName, entry, overrides}: {packageName: string; entry: string; overrides?: UserConfig}) {
    const outputFileName = packageName[0] === '@' ? packageName.slice(packageName.indexOf('/') + 1) : packageName;

    const defaultConfig = defineConfig({
        logLevel: process.env.CI ? 'info' : 'warn',
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
            'process.env.VITEST_SEGFAULT_RETRY': 3
        },
        preview: {
            port: 4174
        },
        build: {
            reportCompressedSize: false,
            minify: true,
            sourcemap: true,
            lib: {
                formats: ['es'],
                entry,
                name: packageName,
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
        }
    });

    return mergeConfig(defaultConfig, overrides || {});
};
