import type {Meta, StoryObj} from '@storybook/react-vite';
import {CodeEditor} from './code-editor';

const meta = {
    title: 'Components / CodeEditor',
    component: CodeEditor,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'CodeMirror-backed code input for HTML/CSS/YAML editing. Language support is supplied per instance via the `extensions` prop (plain or promised, e.g. a lazy `@codemirror/lang-html` import); the CodeMirror bundle itself loads lazily.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px', maxWidth: '640px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Code injection',
        value: '<script>\n    console.log("hello");\n</script>',
        extensions: [],
        hint: 'Injected into {{ghost_head}}'
    }
};

export const WithError: Story = {
    args: {
        title: 'Code injection',
        value: '<script>broken(</script>',
        extensions: [],
        error: true,
        hint: 'Something is wrong with this code'
    }
};
