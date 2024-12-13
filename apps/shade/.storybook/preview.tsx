import React from 'react';

import type { Preview } from "@storybook/react";
import ShadeProvider from '../src/providers/ShadeProvider';
import shadeTheme from './shade-theme';

import '../styles.css';
import './storybook.css';

// import { MINIMAL_VIEWPORTS } from '@storybook/addon-viewport';

const customViewports = {
	sm: {
		name: 'sm',
		styles: {
		width: '480px',
		height: '801px',
		},
	},
	md: {
		name: 'md',
		styles: {
		width: '640px',
		height: '801px',
		},
	},
	lg: {
		name: 'lg',
		styles: {
		width: '1024px',
		height: '801px',
		},
	},
	xl: {
		name: 'xl',
		styles: {
		width: '1320px',
		height: '801px',
		},
	},
	tablet: {
		name: 'tablet',
		styles: {
		width: '860px',
		height: '801px',
		},
	},
};

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
				order: [
					'Welcome', 'Adding components', 'Component usage', 'Conventions', 'Icons',
					'Components', 'Layout', 'Experimental', 'Meta'],
			},
		},
		docs: {
			theme: shadeTheme,
		},
		viewport: {
			viewports: {
				...customViewports,
			},
		},
	},
	decorators: [
		(Story, context) => {
			let {scheme} = context.globals;

			React.useEffect(() => {
				const defaultClassNames = document.body.className.split(' ');
				const newClassNames = ['shade', scheme === 'dark' ? 'dark' : ''];

				// Remove duplicates
				const uniqueClassNames = Array.from(new Set([...defaultClassNames, ...newClassNames]));

				document.body.className = uniqueClassNames.join(' ').trim();
			}, [scheme]);

			return (
			<div style={{
				height: 'unset',
				background: (scheme === 'dark' ? '#131416' : '')
			}}>
				{/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
				<ShadeProvider darkMode={scheme === ''}>
					<Story />
				</ShadeProvider>
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
