import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import TableView from './TableView';
import {Tab} from '../TabView';

const meta = {
    title: 'Global / Table View / Table View Container',
    component: TableView,
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <TableView {...args} onTabChange={(tab) => {
            updateArgs({selectedTab: tab});
            args.onTabChange?.(tab);
        }} />;
    },
    tags: ['autodocs']
} satisfies Meta<typeof TableView>;

export default meta;
type Story = StoryObj<typeof TableView>;

export const Default: Story = {
    args: {
        leftHeaderType: 'text',
        leftHeaderTextSize: 5,
        leftHeaderContent: 'Table view',
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};

const testTabs: Tab[] = [
    {id: 'steph', title: 'Steph Curry', contents: 'Splash Brother #1'},
    {id: 'klay', title: 'Klay Thompson', contents: 'Splash Brother #2'}
];
export const Tabs: Story = {
    args: {
        leftHeaderType: 'tabs',
        leftHeaderContent: testTabs,
        selectedTab: 'steph',
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};
