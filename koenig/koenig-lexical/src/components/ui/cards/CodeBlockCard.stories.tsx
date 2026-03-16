import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from './../CardWrapper';
import {CodeBlockCard} from './CodeBlockCard';
import {MINIMAL_NODES} from '../../../index';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof CodeBlockCard> & {display: keyof typeof displayOptions; caption?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Code card',
    component: CodeBlockCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        }
    },
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, caption, ...args}) => {
    const captionEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: captionEditor, initialHtml: `${caption}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper wrapperStyle='code-card' {...displayOptions[display]} {...args}>
                    <CodeBlockCard captionEditor={captionEditor} updateCode={() => {}} {...displayOptions[display]} {...args} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    code: '',
    language: '',
    caption: ''
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    code: '<script></script>',
    language: 'html',
    caption: 'A code example'
};
