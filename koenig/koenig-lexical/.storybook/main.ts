import type {StorybookConfig} from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions', '@etchteam/storybook-addon-status'],
  features: {
    storyStoreV7: true
  },
  docs: {
    autodocs: true
  }
}

export default config;