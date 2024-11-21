import type { StorybookConfig } from "@storybook/react-vite";
import path from 'path';

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-essentials",
		"@storybook/addon-interactions",
		{
			name: '@storybook/addon-styling',
		},
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	docs: {
		autodocs: "tag",
	},
    async viteFinal(config, options) {
		config.resolve!.alias = {
			...config.resolve!.alias,
			'@': path.resolve(__dirname, '../src'),
			crypto: require.resolve('rollup-plugin-node-builtins')
		}
		return config;
	}
};
export default config;
