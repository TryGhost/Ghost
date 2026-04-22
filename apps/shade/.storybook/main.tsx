import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {StorybookConfig} from '@storybook/react-vite';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// pnpm hoists a transitive `@storybook/react-vite@8.6.14` (from admin-x-design-system
// and signup-form) into `.pnpm/node_modules`, and Storybook's CLI `NODE_PATH` picks
// that up before shade's own v10. Resolving from the config dir forces the shade-local
// v10 packages so the framework, renderer, and addons come from a single matching
// version. Without this the generated `vite-app.js` uses the v8 preview template,
// which references nonexistent `@storybook/react/dist/entry-preview.mjs` imports.
const framework = path.dirname(require.resolve('@storybook/react-vite/package.json'));
const addonLinks = path.dirname(require.resolve('@storybook/addon-links/package.json'));
const addonDocs = path.dirname(require.resolve('@storybook/addon-docs/package.json'));

const config: StorybookConfig = {
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

    addons: [
        addonLinks,
        {
            name: addonDocs,
            options: {
                mdxPluginOptions: {
                    mdxCompileOptions: {
                        providerImportSource: '@storybook/addon-docs/mdx-react-shim'
                    }
                }
            }
        }
    ],

    framework: {
        name: framework,
        options: {}
    },

    async viteFinal(config) {
        config.resolve = config.resolve ?? {};
        config.build = config.build ?? {};
        config.build.rollupOptions = config.build.rollupOptions ?? {};

        if (Array.isArray(config.resolve.alias)) {
            config.resolve.alias = [
                ...config.resolve.alias,
                {find: '@', replacement: path.resolve(__dirname, '../src')}
            ];
        } else {
            config.resolve.alias = {
                ...(config.resolve.alias ?? {}),
                '@': path.resolve(__dirname, '../src')
            };
        }

        // The package Vite config externalizes node_modules for library builds.
        // Storybook needs those modules bundled for docs/stories compilation.
        delete config.build.rollupOptions.external;
        return config;
    }
};
export default config;
