import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import TextArea from './TextArea';

const meta = {
    title: 'Global / Form / Textarea',
    component: TextArea,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        }
    }
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
    args: {
        placeholder: 'Enter description'
    }
};

export const ClearBackground: Story = {
    args: {
        placeholder: 'Enter description',
        clearBg: true
    }
};

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <TextArea {...args} onChange={e => updateArgs({value: e.target.value})} />;
    },
    args: {
        placeholder: 'Enter description',
        value: 'Describe your product'
    }
};

export const WithTitle: Story = {
    args: {
        placeholder: 'Enter description',
        title: 'Description'
    }
};

export const WithHint: Story = {
    args: {
        placeholder: 'Enter description',
        hint: 'Here\'s some hint'
    }
};

export const Resizeable: Story = {
    args: {
        title: 'Description',
        placeholder: 'Try do resize this, I dare you...',
        resize: 'both'
    }
};

export const ResizeDisabled: Story = {
    args: {
        title: 'Description',
        placeholder: 'Try do resize this, I dare you...',
        resize: 'none'
    }
};

export const MaxLength: Story = {
    args: {
        title: 'Description',
        placeholder: 'Try to enter more than 80 characters, I dare you...',
        value: 'This is a nice text area that only accepts up to 80 characters. Try to add more:',
        maxLength: 80
    }
};

export const Error: Story = {
    args: {
        title: 'Description',
        placeholder: 'Enter something',
        hint: 'Invalid value',
        value: 'Value',
        error: true
    }
};

