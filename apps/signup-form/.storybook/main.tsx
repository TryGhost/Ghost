import type { StorybookConfig } from "@storybook/react-vite";

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
	// staticDirs: ['../public/fonts'],
	async viteFinal(config) {
		config.resolve = config.resolve ?? {};

		return config;
	},
};
export default config;
