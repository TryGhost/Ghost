import type {Meta, StoryObj} from '@storybook/react';

import SettingGroupContent from './setting-group-content';

import * as SettingValueStories from './setting-value.stories';
import * as TextFieldStories from '../global/form/text-field.stories';
import TextField from '../global/form/text-field';

const meta = {
    title: 'Settings / Setting Group / Content',
    component: SettingGroupContent,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupContent>;

export default meta;
type Story = StoryObj<typeof SettingGroupContent>;

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

export const Editing: Story = {
    args: {
        columns: 2,
        children: (
            <>
                <TextField {...TextFieldStories.WithHint.args} />
                <TextField {...TextFieldStories.WithHint.args} />
                <TextField {...TextFieldStories.WithHint.args} />
                <TextField {...TextFieldStories.WithHint.args} />
            </>
        )
    }
};
