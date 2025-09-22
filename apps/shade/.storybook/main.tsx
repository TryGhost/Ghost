import type { StorybookConfig } from "@storybook/react-vite";
import path from 'path';

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
