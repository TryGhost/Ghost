import type { StorybookConfig } from '@storybook/preact-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Storybook resolves addon and framework names from its own install location,
// which pnpm's global virtual store isolates from this package's dependencies.
const getAbsolutePath = (value: string): string =>
  dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-links'), getAbsolutePath('@storybook/addon-docs')],
  framework: {
    name: getAbsolutePath('@storybook/preact-vite'),
    options: {},
  },
  // staticDirs: ['../public/fonts'],
  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    // The preact preset aliases React to a bare 'preact/compat', which Storybook's
    // own modules can't resolve from the global virtual store.
    config.resolve.dedupe = [...(config.resolve.dedupe ?? []), 'preact'];

    return config;
  },
};
export default config;
