import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
	addons: [
		"@storybook/addon-links",
		{
			name: "@storybook/addon-docs",
			options: {
				mdxPluginOptions: {
					mdxCompileOptions: {
						providerImportSource: "@storybook/addon-docs/mdx-react-shim"
					}
				}
			}
		}
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	docs: {
		autodocs: "tag",
	},
	async viteFinal(config) {
		config.resolve = config.resolve ?? {};
		config.build = config.build ?? {};
		config.build.rollupOptions = config.build.rollupOptions ?? {};

		delete config.build.rollupOptions.external;
		return config;
	}
};
export default config;
