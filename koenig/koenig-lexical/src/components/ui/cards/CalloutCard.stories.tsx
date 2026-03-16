import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CalloutCard} from './CalloutCard';
import {CardWrapper} from './../CardWrapper';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof CalloutCard> & {display: keyof typeof displayOptions; value?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Callout card',
    component: CalloutCard,
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
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, value, ...args}) => {
    const textEditor = createEditor();
    populateEditor({editor: textEditor, initialHtml: `${value}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...displayOptions[display]} {...args}>
                    <CalloutCard {...displayOptions[display]} {...args} textEditor={textEditor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    value: '',
    hasEmoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {}
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    value: 'Something to pay attention to.',
    hasEmoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {}
};

