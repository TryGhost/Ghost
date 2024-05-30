import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import TabView from './TabView';

const meta = {
    title: 'Global / Tab view',
    component: TabView,
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <TabView {...args} onTabChange={(tab) => {
            updateArgs({selectedTab: tab});
            args.onTabChange?.(tab);
        }} />;
    },
    tags: ['autodocs']
} satisfies Meta<typeof TabView>;

export default meta;
type Story = StoryObj<typeof TabView>;

const tabs = [
    {id: 'tab-1', title: 'Tab one', contents: <div className='py-5'>Contents one</div>},
    {id: 'tab-2', title: 'Tab two', contents: <div className='py-5'>Contents two</div>},
    {id: 'tab-3', title: 'Tab three', contents: <div className='py-5'>Contents three</div>},
    {id: 'tab-4', title: 'Tab four', contents: <div className='py-5'>Contents one</div>},
    {id: 'tab-5', title: 'Tab five', contents: <div className='py-5'>Contents two</div>},
    {id: 'tab-6', title: 'Backstreet boys', contents: <div className='py-5'>Contents three</div>}
];

const tabsWithIcons = [
    {id: 'tab-1', title: 'Some items', icon: 'at-sign', contents: <div className='py-5'>Contents one</div>},
    {id: 'tab-2', title: 'Lots of items', icon: 'hamburger', contents: <div className='py-5'>Contents two</div>},
    {id: 'tab-3', title: 'No items', icon: 'laptop', contents: <div className='py-5'>Contents three</div>}
];

const tabsWithCounters = [
    {id: 'tab-1', title: 'Some items', counter: 4, contents: <div className='py-5'>Contents one</div>},
    {id: 'tab-2', title: 'Lots of items', counter: 12, contents: <div className='py-5'>Contents two</div>},
    {id: 'tab-3', title: 'No items', counter: 0, contents: <div className='py-5'>Contents three</div>}
];

export const Default: Story = {
    args: {
        tabs: tabs,
        selectedTab: 'tab-2'
    }
};

export const NoBorder: Story = {
    args: {
        tabs: tabs,
        border: false
    }
};

export const WithIcon: Story = {
    args: {
        tabs: tabsWithIcons
    }
};

export const WithCounter: Story = {
    args: {
        tabs: tabsWithCounters
    }
};

export const WithTopRightContent: Story = {
    args: {
        tabs: tabs,
        topRightContent: <p>Some content</p>
    }
};
