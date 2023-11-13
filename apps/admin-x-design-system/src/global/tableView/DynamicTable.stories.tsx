import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import DynamicTable, {DynamicTableTab} from './DynamicTable';

const meta = {
    title: 'Global / Dynamic Table / Dynamic Table Container',
    component: DynamicTable,
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <DynamicTable {...args} onTabChange={(tab) => {
            updateArgs({selectedTab: tab});
            args.onTabChange?.(tab);
        }} />;
    },
    tags: ['autodocs']
} satisfies Meta<typeof DynamicTable>;

export default meta;
type Story = StoryObj<typeof DynamicTable>;

export const Default: Story = {
    args: {
        headingType: 'text',
        headingContent: 'Table view',
        children: 'Hello default view'
    }
};

export const HeadingSize: Story = {
    args: {
        headingType: 'text',
        headingContent: 'Smaller heading',
        headingTextSize: 4,
        children: 'Hello default view'
    }
};

const simpleTabs: DynamicTableTab[] = [
    {
        id: 'steph',
        title: 'Steph Curry',
        contents: 'Splash Brother #1'
    },
    {
        id: 'klay',
        title: 'Klay Thompson',
        contents: 'Splash Brother #2'
    }
];

export const TabsSimpleView: Story = {
    args: {
        headingType: 'tabs',
        tabs: simpleTabs,
        selectedTab: 'steph'
    }
};

const multiViewTabs: DynamicTableTab[] = [
    {
        id: 'steph',
        title: 'Steph Curry',
        views: [
            {
                id: 'view-one',
                viewName: 'View one',
                contents: 'Hello tab 1 / view 1'
            },
            {
                id: 'view-two',
                viewName: 'View two',
                contents: 'Hello tab 1 / view 2'
            }
        ]
    },
    {
        id: 'klay',
        title: 'Klay Thompson',
        views: [
            {
                id: 'view-one',
                viewName: 'View one',
                contents: 'Hello tab 2 / view 1'
            },
            {
                id: 'view-two',
                viewName: 'View two',
                contents: 'Hello tab 2 / view 2'
            },
            {
                id: 'view-three',
                viewName: 'View three',
                contents: 'Hello tab 2 / view 3'
            }
        ]
    }
];

export const TabsMultiView: Story = {
    args: {
        headingType: 'tabs',
        tabs: multiViewTabs,
        selectedTab: 'steph'
    }
};