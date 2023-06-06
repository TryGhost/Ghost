import type {Meta, StoryObj} from '@storybook/react';

import TabView from './TabView';

const meta = {
    title: 'Global / Tab view',
    component: TabView,
    tags: ['autodocs']
} satisfies Meta<typeof TabView>;

export default meta;
type Story = StoryObj<typeof TabView>;

const tabs = [
    {id: 'tab-1', title: 'Tab one', contents: <div className='py-5'>Contents one</div>},
    {id: 'tab-2', title: 'Tab two', contents: <div className='py-5'>Contents two</div>},
    {id: 'tab-3', title: 'Tab three', contents: <div className='py-5'>Contents three</div>}
];

export const Default: Story = {
    args: {
        tabs: tabs
    }
};

export const DefaultSelected: Story = {
    args: {
        tabs: tabs,
        defaultSelected: 'tab-2'
    }
};