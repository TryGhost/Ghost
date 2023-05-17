import type {Meta, StoryObj} from '@storybook/react';

import SettingGroupInputs from './SettingGroupInputs';
import TextField from '../global/TextField';

import * as TextFieldStories from '../global/TextField.stories';

const meta = {
    title: 'Settings / Setting Group Inputs',
    component: SettingGroupInputs,
    tags: ['autodocs']
} satisfies Meta<typeof SettingGroupInputs>;

export default meta;
type Story = StoryObj<typeof SettingGroupInputs>;

export const SingleColumn: Story = {
    args: {
        children: 
            <>
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
            </>
    }
};

export const TwoColumns: Story = {
    args: {
        columns: 2,
        children: 
            <>
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
                <TextField {...TextFieldStories.WithHeading.args} />
            </>
    }
};