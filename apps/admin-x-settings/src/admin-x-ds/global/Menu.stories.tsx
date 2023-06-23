import type {Meta, StoryObj} from '@storybook/react';

import Button from './Button';
import Menu from './Menu';

const meta = {
    title: 'Global / Menu',
    component: Menu,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '100px', margin: '0 auto', padding: '100px 0 200px'}}>{_story()}</div>)]
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

const longItems = [
    {id: 'item-1', label: 'This is a really, really long item that nobody should be using but oh well'},
    {id: 'item-2', label: 'Item 2'},
    {id: 'item-3', label: 'Item 3'}
];

export const Default: Story = {
    args: {
        trigger: <Button color='green' label="Click"></Button>,
        items: items,
        position: 'left'
    },
    decorators: [
        ThisStory => (
            <div style={{maxWidth: '100px', margin: '0 auto'}}><ThisStory /></div>
        )
    ]
};

export const Right: Story = {
    args: {
        trigger: <Button color='green' label="Click"></Button>,
        items: items,
        position: 'right'
    },
    decorators: [
        ThisStory => (
            <div style={{maxWidth: '100px', margin: '0 auto'}}><ThisStory /></div>
        )
    ]
};

export const LongLabels: Story = {
    args: {
        trigger: <Button color='green' label="Click"></Button>,
        items: longItems,
        position: 'right'
    }
};