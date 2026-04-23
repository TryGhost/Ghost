import {createRequire} from 'node:module';
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);

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

		delete config.build.rollupOptions.external;
		return config;
	}
};
export default config;
