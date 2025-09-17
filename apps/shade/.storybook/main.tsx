import { createRequire } from "node:module";
import type { StorybookConfig } from "@storybook/react-vite";
import path, { dirname, join } from 'path';

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],

    addons: [getAbsolutePath("@storybook/addon-links"), getAbsolutePath("@storybook/addon-docs")],

    framework: {
		name: getAbsolutePath("@storybook/react-vite"),
		options: {},
	},

    async viteFinal(config) {
		config.resolve!.alias = {
			...config.resolve!.alias,
			'@': path.resolve(__dirname, '../src'),
			crypto: require.resolve('rollup-plugin-node-builtins')
		}
		return config;
	}
};
export default config;

function getAbsolutePath(value: string): any {
    return dirname(require.resolve(join(value, "package.json")));
}
