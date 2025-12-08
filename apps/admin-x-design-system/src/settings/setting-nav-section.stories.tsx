import type {Meta, StoryObj} from '@storybook/react';

import SettingNavItem from './setting-nav-item';
import SettingNavSection from './setting-nav-section';

import {Default as DefaultNavItem} from './setting-nav-item.stories';

const meta = {
    title: 'Settings / Sidebar Navigation Section',
    component: SettingNavSection,
    tags: ['autodocs']
} satisfies Meta<typeof SettingNavSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Setting section',
        children:
            <>
                <SettingNavItem {...DefaultNavItem.args} />
                <SettingNavItem {...DefaultNavItem.args} />
                <SettingNavItem {...DefaultNavItem.args} />
                <SettingNavItem {...DefaultNavItem.args} />
                <SettingNavItem {...DefaultNavItem.args} />
            </>
    }
};
