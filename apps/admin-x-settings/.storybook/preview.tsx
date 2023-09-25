import React from 'react';

import '../src/styles/demo.css';
import type { Preview } from "@storybook/react";
import '../src/admin-x-ds/providers/DesignSystemProvider';
import DesignSystemProvider from '../src/admin-x-ds/providers/DesignSystemProvider';

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
				mathod: 'alphabetical',
				order: ['Global', ['Chrome', 'Form', 'Modal', 'Layout', 'List', '*'], 'Settings', ['Setting Section', 'Setting Group', '*'], 'Experimental'],
			},
		},
	},
	decorators: [
		(Story, context) => {
			let {scheme} = context.globals;

			return (
			<div className={`admin-x-settings ${scheme === 'dark' ? 'dark' : ''}`} style={{
				padding: '24px',
				background: (scheme === 'dark' ? '#131416' : '')
			}}>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<DesignSystemProvider>
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
