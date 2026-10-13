import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import type {StorybookConfig} from '@storybook/react-vite';

// Storybook resolves addon and framework names from its own install location,
// which pnpm's global virtual store isolates from this package's dependencies.
const getAbsolutePath = (value: string): string =>
  dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

const config: StorybookConfig = {
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {}
  },
  viteFinal: async (config) => {
    return mergeConfig(config, {
      optimizeDeps: {
        include: ['@storybook/react'],
      },
    });
  },
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@etchteam/storybook-addon-status")
  ],
  features: {
  },
  docs: {}
}

export default config;
