import {ReactNode} from 'react';
import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import TextArea from './TextArea';

const meta = {
    title: 'Global / Form / Textarea',
    component: TextArea,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
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
        title: 'Description',
        placeholder: 'Enter description',
        hint: 'Here\'s some hint'
    }
};

export const Monospace: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();
        return <TextArea {...args} onChange={e => updateArgs({value: e.target.value})} />;
    },
    args: {
        title: 'Code',
        fontStyle: 'mono',
        value: `<html><body><h1>✨</h1></body></html>`
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

export const Error: Story = {
    args: {
        title: 'Description',
        placeholder: 'Enter something',
        hint: 'Invalid value',
        value: 'Value',
        error: true
    }
};

