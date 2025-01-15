import { dirname, join } from "path";
import { mergeConfig } from 'vite';
import type {StorybookConfig} from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {}
  },
  core: {
    builder: getAbsolutePath("@storybook/builder-vite")
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
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@etchteam/storybook-addon-status")
  ],
  features: {
  },
  docs: {}
}

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
