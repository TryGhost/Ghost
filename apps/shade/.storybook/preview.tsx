import React from 'react';

import '../styles.css';
import './storybook.css';

import type { Preview } from '@storybook/react-vite';
import ShadeProvider from '../src/providers/shade-provider';
import shadeTheme from './shade-theme';

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

const StorybookSchemeDecorator = ({
  Story,
  scheme,
  admin7Design,
}: {
  Story: React.ComponentType;
  scheme: string;
  admin7Design: boolean;
}) => {
  React.useEffect(() => {
    const isDark = scheme === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);

    return () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
  }, [scheme]);

  return (
    <div
      className={`shade ${scheme === 'dark' ? 'dark' : ''}`}
      style={{
        // padding: '24px',
        // width: 'unset',
        height: 'unset',
        // overflow: 'unset',
        background: scheme === 'dark' ? '#131416' : '',
      }}
      data-admin7-design={admin7Design}
    >
      {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
      <ShadeProvider admin7Design={admin7Design} darkMode={scheme === 'dark'}>
        <Story />
      </ShadeProvider>
    </div>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
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
          'Overview',
          ['Introduction', 'Ghost Apps'],
          'Tokens',
          [
            'Tokens Guide',
            'Colors',
            'Typography',
            'Spacing',
            'Radius',
            'Shadows',
            'Motion',
            'Breakpoints',
          ],
          'Primitives',
          ['Primitives Guide', '*'],
          'Components',
          ['Components Guide', '*'],
          'Patterns',
          ['Patterns Guide', '*'],
          'Page Templates',
          ['Page Types', '*'],
          'Recipes',
          ['Recipes Guide', '*'],
          'Deprecated',
          '*',
        ],
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
      let { scheme, admin7Design } = context.globals;

      return (
        <StorybookSchemeDecorator
          admin7Design={admin7Design !== 'off'}
          Story={Story}
          scheme={scheme}
        />
      );
    },
  ],
  globalTypes: {
    scheme: {
      name: 'Scheme',
      description: 'Select light or dark mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    admin7Design: {
      name: 'admin7Design',
      description: "Preview Admin's admin7Design Labs flag on or off",
      defaultValue: 'on',
      toolbar: {
        title: 'admin7Design',
        icon: 'flag',
        items: [
          { value: 'on', title: 'admin7Design on' },
          { value: 'off', title: 'admin7Design off' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
