import type {Meta, StoryObj} from '@storybook/react';

import SettingNavItem from './SettingNavItem';

const meta = {
    title: 'Settings / Sidebar Navigation Item',
    component: SettingNavItem,
    tags: ['autodocs']
} satisfies Meta<typeof SettingNavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Navigation item'
    }
};