import type {Meta, StoryObj} from '@storybook/react';

import SettingValue from './SettingValue';

const meta = {
    title: 'Settings / Setting Value',
    component: SettingValue,
    tags: ['autodocs']
} satisfies Meta<typeof SettingValue>;

export default meta;
type Story = StoryObj<typeof SettingValue>;

export const Default: Story = {
    args: {
        value: 'Hello'
    }
};