import type {Meta, StoryObj} from '@storybook/react';

import PageToolbar from './PageToolbar';

const meta = {
    title: 'Global / Layout / Page Toolbar',
    component: PageToolbar,
    tags: ['autodocs']
} satisfies Meta<typeof PageToolbar>;

export default meta;
type Story = StoryObj<typeof PageToolbar>;

export const Default: Story = {
    args: {
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};
