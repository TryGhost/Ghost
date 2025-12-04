import type {Meta, StoryObj} from '@storybook/react';

import * as CheckboxGroupStories from './checkbox-group.stories';
import * as TextFieldStories from './text-field.stories';
import CheckboxGroup from './checkbox-group';
import Form from './form';
import TextField from './text-field';

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

export const WithTitle: Story = {
    args: {
        title: 'Form group',
        children: formElements
    }
};

export const Grouped: Story = {
    args: {
        title: 'Form group',
        children: formElements,
        grouped: true
    }
};
