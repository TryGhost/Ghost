import type {Meta, StoryObj} from '@storybook/react';

import * as CheckboxGroupStories from './CheckboxGroup.stories';
import * as TextFieldStories from './TextField.stories';
import CheckboxGroup from './CheckboxGroup';
import Form from './Form';
import TextField from './TextField';

const meta = {
    title: 'Global / Form / Form (group)',
    component: Form,
    tags: ['autodocs']
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof Form>;

const formElements = <>
    <CheckboxGroup {...CheckboxGroupStories.WithTitleAndHint.args} />
    <TextField {...TextFieldStories.WithHeading.args} />
</>;

export const Default: Story = {
    args: {
        children: formElements
    }
};

export const SmallGap: Story = {
    args: {
        children: formElements,
        gap: 'sm'
    }
};

export const LargeGap: Story = {
    args: {
        children: formElements,
        gap: 'lg'
    }
};