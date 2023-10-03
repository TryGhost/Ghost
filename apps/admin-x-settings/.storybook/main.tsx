import {resolve} from "path";
import type { StorybookConfig } from "@storybook/react-vite";
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
	// staticDirs: ['../public/fonts'],
	async viteFinal(config, options) {
		config.resolve.alias = {
			crypto: require.resolve('rollup-plugin-node-builtins'),
			// @TODO: Remove this when @tryghost/nql is updated
			mingo: resolve(__dirname, '../../../node_modules/mingo/dist/mingo.js')
		}
		return config;
	},
};
export default config;
