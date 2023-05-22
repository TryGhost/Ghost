import type {Meta, StoryObj} from '@storybook/react';

import * as ListItemStories from './ListItem.stories';
import List from './List';
import ListItem from './ListItem';

const meta = {
    title: 'Global / List',
    component: List,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '600px'}}>{_story()}</div>)]
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof List>;

const listItemProps = {
    title: ListItemStories.HiddenActions.args?.title,
    detail: ListItemStories.HiddenActions.args?.detail,
    action: ListItemStories.HiddenActions.args?.action,
    hideActions: ListItemStories.HiddenActions.args?.hideActions,
    separator: true,
    onClick: ListItemStories.HiddenActions.args?.onClick
};

const listItems = (
    <>
        <ListItem id='list-item-1' {...listItemProps}/>
        <ListItem id='list-item-2' {...listItemProps}/>
        <ListItem id='list-item-3' {...listItemProps}/>
    </>
);

export const Default: Story = {
    args: {
        title: 'This is a list',
        children: listItems,
        hint: 'And here is a hint for the whole list'
    }
};
