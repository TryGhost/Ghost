import type { StorybookConfig } from '@storybook/react-vite';
import type { ServerApp } from 'storybook/internal/types';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';
import remarkGfm from 'remark-gfm';
import {
  generateStorybookDocs,
  STORYBOOK_DOCS_DIR,
  storybookDocsPlugin,
  utf8DocsMiddleware,
} from '../scripts/storybook-docs.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storybook resolves addon and framework names from its own install location,
// which pnpm's global virtual store isolates from this package's dependencies.
const getAbsolutePath = (value: string): string =>
  dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

// Storybook resolves `staticDirs` more than once; generate the docs once per run.
let docsGenerated: Promise<boolean> | undefined;

// `experimental_devServer` is a preset property that `StorybookConfig` doesn't list yet.
const config: StorybookConfig & { experimental_devServer?: (app: ServerApp) => ServerApp } = {
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

  // Serves the Markdown docs at /docs/<path>.md and /llms.txt (see scripts/storybook-docs.ts).
  // A failed docs build stops `storybook build` but only logs during `storybook dev`.
  async staticDirs(dirs, { configType }) {
    docsGenerated ??= generateStorybookDocs({ failOnError: configType === 'PRODUCTION' });
    await docsGenerated;
    return [...(dirs ?? []), STORYBOOK_DOCS_DIR];
  },

  // Runs before Storybook's static handler (a Vite middleware would run after it),
  // so the served docs get `charset=utf-8` in dev.
  experimental_devServer(app) {
    return app.use(utf8DocsMiddleware);
  },

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  async viteFinal(config, { configType }) {
    if (configType === 'DEVELOPMENT') {
      config.plugins = [...(config.plugins ?? []), storybookDocsPlugin()];
    }
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
