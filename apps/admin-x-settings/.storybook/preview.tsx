import React from 'react';

import '../src/styles/demo.css';
import type { Preview } from "@storybook/react";

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
		(Story) => (
			<div className="admin-x-settings" style={{ padding: '24px' }}>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<Story />
			</div>
		),
	],
};

export default preview;
