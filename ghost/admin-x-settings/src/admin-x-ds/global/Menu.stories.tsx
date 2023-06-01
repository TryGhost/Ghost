import type {Meta, StoryObj} from '@storybook/react';

import Menu from './Menu';

const meta = {
    title: 'Global / Menu',
    component: Menu,
    tags: ['autodocs']
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof Menu>;

const items = [
    {id: 'item-1', label: 'Item 1'},
    {id: 'item-2', label: 'Item 2'},
    {id: 'item-3', label: 'Item 3'}
];

export const Default: Story = {
    args: {
        items
    }
};
