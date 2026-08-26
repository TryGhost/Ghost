import type {Meta, StoryObj} from '@storybook/react-vite';

import {CodeEditor} from '@/components/ui/code-editor';

const meta = {
    title: 'Components / CodeEditor',
    component: CodeEditor,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'CodeMirror-backed input for editing code with consumer-provided language support.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{maxWidth: '640px', padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        extensions: [],
        hint: 'Injected into {{ghost_head}}',
        title: 'Code injection',
        value: '<script>\n    console.log("hello");\n</script>'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for editable code with a visible label and supporting hint.'
            }
        }
    }
};

export const Focused: Story = {
    args: {
        autoFocus: true,
        extensions: [],
        title: 'Focused editor',
        value: 'body { color: currentColor; }'
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the focus-visible treatment used while editing code.'
            }
        }
    }
};

export const WithError: Story = {
    args: {
        error: true,
        extensions: [],
        hint: 'Something is wrong with this code.',
        title: 'Code injection',
        value: '<script>broken(</script>'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use the error state to associate invalid editor chrome with a corrective hint.'
            }
        }
    }
};

export const Disabled: Story = {
    args: {
        editable: false,
        extensions: [],
        title: 'Code injection',
        value: '<style>body { color: currentColor; }</style>'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when code should remain visible but cannot be changed.'
            }
        }
    }
};
