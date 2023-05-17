import type {Meta, StoryObj} from '@storybook/react';

import TextField from './TextField';

const meta = {
    title: 'Global / Textfield',
    component: TextField,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
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

export const WithHint: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something',
        hint: 'Here\'s some hint'
    }
};

export const Error: Story = {
    args: {
        title: 'Title',
        placeholder: 'Enter something',
        hint: 'Invalid value',
        value: 'Value',
        error: true
    }
};