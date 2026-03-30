import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import type { StorybookConfig } from "@storybook/react-vite";
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    async viteFinal(config) {
		config.resolve = config.resolve ?? {};
		config.build = config.build ?? {};
		config.build.rollupOptions = config.build.rollupOptions ?? {};

		if (Array.isArray(config.resolve.alias)) {
			config.resolve.alias = [
				...config.resolve.alias,
				{find: '@', replacement: path.resolve(__dirname, '../src')}
			];
		} else {
			config.resolve.alias = {
				...(config.resolve.alias ?? {}),
				'@': path.resolve(__dirname, '../src')
			};
		}

		// The package Vite config externalizes node_modules for library builds.
		// Storybook needs those modules bundled for docs/stories compilation.
		delete config.build.rollupOptions.external;
		return config;
	}
};
export default config;
