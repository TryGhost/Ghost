import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor.js';
import {CalloutCard} from './CalloutCard';
import {CardWrapper} from './../CardWrapper';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Callout card',
    component: CalloutCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
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

const Template = ({display, value, ...args}) => {
    const textEditor = createEditor();
    populateNestedEditor({editor: textEditor, initialHtml: `<p>${value}</p>`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <CalloutCard {...display} {...args} textEditor={textEditor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    value: '',
    placeholder: 'Callout text...',
    emoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {}
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    value: 'Something to pay attention to.',
    placeholder: 'Callout text...',
    emoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {}
};

