import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';
import remarkGfm from 'remark-gfm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storybook resolves addon and framework names from its own install location,
// which pnpm's global virtual store isolates from this package's dependencies.
const getAbsolutePath = (value: string): string =>
  dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    {
      name: getAbsolutePath('@storybook/addon-docs'),
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            providerImportSource: '@storybook/addon-docs/mdx-react-shim',
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.build = config.build ?? {};
    config.build.rollupOptions = config.build.rollupOptions ?? {};

    if (Array.isArray(config.resolve.alias)) {
      config.resolve.alias = [
        ...config.resolve.alias,
        { find: '@', replacement: path.resolve(__dirname, '../src') },
      ];
    } else {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@': path.resolve(__dirname, '../src'),
      };
    }

    // The package Vite config externalizes node_modules for library builds.
    // Storybook needs those modules bundled for docs/stories compilation.
    delete config.build.rollupOptions.external;
    return config;
  },
};
export default config;
