import { mergeConfig } from 'vite';
import type {StorybookConfig} from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
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
    "@storybook/addon-links",
    "@storybook/addon-docs",
    "@etchteam/storybook-addon-status"
  ],
  features: {
  },
  docs: {}
}

export default config;
