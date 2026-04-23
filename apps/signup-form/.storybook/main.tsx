import {createRequire} from 'node:module';
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
	addons: [
		"@storybook/addon-links",
		"@storybook/addon-docs"
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	docs: {
		autodocs: "tag",
	},
	// staticDirs: ['../public/fonts'],
	async viteFinal(config) {
		config.resolve = config.resolve ?? {};

		if (Array.isArray(config.resolve.alias)) {
			config.resolve.alias = [
				...config.resolve.alias,
				{find: 'crypto', replacement: require.resolve('rollup-plugin-node-builtins')}
			];
		} else {
			config.resolve.alias = {
				...(config.resolve.alias ?? {}),
				crypto: require.resolve('rollup-plugin-node-builtins')
			};
		}

		return config;
	},
};
export default config;
