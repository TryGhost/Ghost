import type {Meta, StoryObj} from '@storybook/react';

import SettingValue from './SettingValue';

const meta = {
    title: 'Settings / Setting value',
    component: SettingValue,
    tags: ['autodocs']
} satisfies Meta<typeof SettingValue>;

export default meta;
type Story = StoryObj<typeof SettingValue>;

export const Default: Story = {
    args: {
        heading: 'Setting',
        value: 'Setting value'
    }
};

export const WithHelp: Story = {
    args: {
        heading: 'Setting',
        value: 'Setting value',
        help: 'Setting help text'
    }
};

export const NoHeading: Story = {
    args: {
        value: 'Setting value',
        help: 'Help text'
    }
};