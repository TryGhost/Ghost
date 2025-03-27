import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
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
    {id: 'item-3', label: 'Click me', onClick: () => {
        alert('Clicked!');
    }}
];

export const Default: Story = {
    args: {
        trigger: <Button color='black' label="Click"></Button>,
        items: items,
        position: 'start'
    },
    decorators: [
        ThisStory => (
            <div style={{maxWidth: '100px', margin: '0 auto'}}><ThisStory /></div>
        )
    ]
};

export const Right: Story = {
    args: {
        trigger: <Button color='black' label="Click"></Button>,
        items: items,
        position: 'end'
    },
    decorators: [
        ThisStory => (
            <div style={{maxWidth: '100px', margin: '0 auto'}}><ThisStory /></div>
        )
    ]
};
