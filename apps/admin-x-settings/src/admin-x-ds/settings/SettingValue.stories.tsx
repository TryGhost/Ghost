import type {Meta, StoryObj} from '@storybook/react';

import SettingValue from './SettingValue';

const meta = {
    title: 'Settings / Setting Value',
    component: SettingValue,
    tags: ['autodocs'],
    argTypes: {
        value: {
            control: 'text'
        },
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof SettingValue>;

export default meta;
type Story = StoryObj<typeof SettingValue>;

export const Default: Story = {
    args: {
        heading: 'Setting',
        value: 'Setting value'
    }
};

export const WithHint: Story = {
    args: {
        heading: 'Setting',
        value: 'Setting value',
        hint: 'Setting hint text'
    }
};

export const NoHeading: Story = {
    args: {
        value: 'Setting value',
        hint: 'Hint text'
    }
};