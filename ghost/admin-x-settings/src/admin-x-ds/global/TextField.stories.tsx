import type {Meta, StoryObj} from '@storybook/react';

import TextField from './TextField';

const meta = {
    title: 'Global / Input / Textfield',
    component: TextField,
    tags: ['autodocs']
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
    args: {
        placeholder: 'Enter something'
    }
};

export const WithValue: Story = {
    args: {
        placeholder: 'Enter something',
        value: 'Value'
    }
};

export const WithHeading: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something'
    }
};

export const WithHelp: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something',
        help: 'Here\'s some help'
    }
};