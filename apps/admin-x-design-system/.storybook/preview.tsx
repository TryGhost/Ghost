import React from 'react';

import '../styles.css';
import './storybook.css';

import type { Preview } from "@storybook/react";
import DesignSystemProvider from '../src/providers/DesignSystemProvider';
import adminxTheme from './adminx-theme';

const preview: Preview = {
	parameters: {
		actions: { argTypesRegex: "^on[A-Z].*" },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/,
			},
		},
		options: {
			storySort: {
				method: 'alphabetical',
				order: ['Welcome', 'Foundations', ['Style Guide', 'Colors', 'Icons', 'ErrorHandling'], 'Global', ['Form', 'Chrome', 'Modal', 'Layout', 'List', 'Table', '*'], 'Settings', ['Setting Section', 'Setting Group', '*'], 'Experimental'],
			},
		},
		docs: {
			theme: adminxTheme,
		},
	},
	decorators: [
		(Story, context) => {
			let {scheme} = context.globals;

			return (
			<div className={`admin-x-design-system admin-x-base ${scheme === 'dark' ? 'dark' : ''}`} style={{
				// padding: '24px',
				// width: 'unset',
				height: 'unset',
				// overflow: 'unset',
				background: (scheme === 'dark' ? '#131416' : '')
			}}>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<DesignSystemProvider fetchKoenigLexical={async () => {}}>
					<Story />
				</DesignSystemProvider>
			</div>);
	},
	],
	globalTypes: {
		scheme: {
			name: "Scheme",
			description: "Select light or dark mode",
			defaultValue: "light",
			toolbar: {
				icon: "mirror",
				items: ["light", "dark"],
				dynamicTitle: true
			}
		}
	}
};

export default preview;
