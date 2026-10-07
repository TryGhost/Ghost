import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ErrorPage } from './error-page';

const meta = {
  title: 'Deprecated / ErrorPage',
  component: ErrorPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-height fallback the Admin router shows when a route fails to load. Compose product-specific error states from primitives instead.',
      },
    },
  },
  args: {
    onBackToDashboard: fn(),
  },
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof ErrorPage>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The default error element for routes without one of their own.',
      },
    },
  },
};
