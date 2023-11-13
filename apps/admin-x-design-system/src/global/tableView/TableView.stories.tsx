import type {Meta, StoryObj} from '@storybook/react';

import TableView from './TableView';
import {Tab} from '../TabView';

const meta = {
    title: 'Global / Table View / Table View Container',
    component: TableView,
    tags: ['autodocs']
} satisfies Meta<typeof TableView>;

export default meta;
type Story = StoryObj<typeof TableView>;

export const Default: Story = {
    args: {
        headerLeft: {
            type: 'text',
            textSize: 5,
            content: 'Table view'
        },
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};

const testTabs: Tab[] = [
    {id: 'steph', title: 'Steph Curry', contents: 'Splash Brother #1'},
    {id: 'klay', title: 'Klay Thompson', contents: 'Splash Brother #2'}
];
export const Tabs: Story = {
    args: {
        headerLeft: {
            type: 'tabs',
            content: testTabs
        },
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};
