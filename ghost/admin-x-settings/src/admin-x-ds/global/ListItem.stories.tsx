import React from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import Avatar from './Avatar';
import Button from './Button';
import ListItem from './ListItem';

const meta = {
    title: 'Global / List / List Item',
    component: ListItem,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '600px'}}>{_story()}</div>)],
    argTypes: {
        title: {control: 'text'},
        detail: {control: 'text'}
    }
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof ListItem>;

export const Default: Story = {
    args: {
        id: 'list-item',
        title: 'A list item',
        detail: 'Some details',
        action: <Button color='green' label='Edit' link={true} />,
        separator: true,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            const clickedDiv = e.currentTarget;
            alert(`Clicked on "${clickedDiv.id}"`);
        }
    }
};

export const HiddenActions: Story = {
    args: {
        id: 'list-item',
        title: 'A list item',
        detail: 'Some details',
        action: <Button color='green' label='Edit' link={true} />,
        separator: true,
        hideActions: true,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            const clickedDiv = e.currentTarget;
            alert(`Clicked on "${clickedDiv.id}"`);
        }
    }
};

export const WithAvatar: Story = {
    args: {
        ...HiddenActions.args,
        avatar: (<Avatar bgColor='green' label='DV' labelColor='white' />),
        hideActions: false
    }
};
