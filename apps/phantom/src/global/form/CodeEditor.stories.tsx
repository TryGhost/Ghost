import {html} from '@codemirror/lang-html';
import {useArgs} from '@storybook/preview-api';
import type {Meta, StoryObj} from '@storybook/react';

import CodeEditor from './CodeEditor';

const meta = {
    title: 'Global / Form / Code Editor',
    component: CodeEditor,
    tags: ['autodocs'],
    // decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    argTypes: {
        hint: {
            control: 'text'
        },
        extensions: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof CodeEditor>;

export const WithValue: Story = {
    render: function Component(args) {
        const [, updateArgs] = useArgs();

        return <CodeEditor {...args} onChange={value => updateArgs({value})} />;
    },
    args: {
        extensions: [html()],
        value: '<p>HTML goes here</p>'
    }
};

export const WithTitle: Story = {
    args: {
        extensions: [html()],
        title: 'Header code'
    }
};

export const WithHint: Story = {
    args: {
        extensions: [html()],
        hint: 'Here\'s some hint'
    }
};

export const Error: Story = {
    args: {
        title: 'Header code',
        extensions: [html()],
        hint: 'Don\'t use script tags',
        value: '<script>alert("bad")</script>',
        error: true
    }
};

