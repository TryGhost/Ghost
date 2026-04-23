import {dirname} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import type { StorybookConfig } from "@storybook/react-vite";
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

function getAbsolutePath(value: string) {
    return dirname(require.resolve(path.join(value, 'package.json')));
}

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],

    addons: [
        getAbsolutePath('@storybook/addon-links'),
        {
            name: getAbsolutePath('@storybook/addon-docs'),
            options: {
                mdxPluginOptions: {
                    mdxCompileOptions: {
                        providerImportSource: "@storybook/addon-docs/mdx-react-shim"
                    }
                }
            }
        }
    ],

    core: {
        builder: require.resolve('@storybook/builder-vite')
    },

    framework: {
		name: getAbsolutePath('@storybook/react-vite'),
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
