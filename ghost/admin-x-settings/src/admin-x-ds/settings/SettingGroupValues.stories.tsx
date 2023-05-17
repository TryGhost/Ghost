import type {Meta, StoryObj} from '@storybook/react';

import SettingGroupValues from './SettingGroupValues';

import * as SettingValueStories from './SettingValue.stories';

const meta = {
    title: 'Settings / Setting group values',
    component: SettingGroupValues,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupValues>;

export default meta;
type Story = StoryObj<typeof SettingGroupValues>;

const values = [
    {...SettingValueStories.Default.args, key: '1', heading: 'Setting one', value: 'Value one'},
    {...SettingValueStories.Default.args, key: '2', heading: 'Setting two', value: 'Value two'},
    {...SettingValueStories.Default.args, key: '3', heading: 'Setting three', value: 'Value three'},
    {...SettingValueStories.Default.args, key: '4', heading: 'Setting four', value: 'Value four'}
];

export const SingleColumn: Story = {
    args: {
        values: values
    }
};

export const TwoColumns: Story = {
    args: {
        values: values,
        columns: 2
    }
};