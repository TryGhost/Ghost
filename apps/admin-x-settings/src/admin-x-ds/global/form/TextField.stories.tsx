import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import TextField from './TextField';

const meta = {
    title: 'Global / Form / Textfield',
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

export const ClearBackground: Story = {
    args: {
        placeholder: 'Enter something',
        clearBg: true
    }
};

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <TextField {...args} onChange={e => updateArgs({value: e.target.value})} />;
    },
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

export const WithRightPlaceholder: Story = {
    args: {
        title: 'Monthly price',
        placeholder: '0',
        rightPlaceholder: 'USD/month'
    }
};

export const PasswordType: Story = {
    args: {
        title: 'Password',
        type: 'password',
        placeholder: 'Enter password',
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
