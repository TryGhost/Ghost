import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {BASIC_NODES, MINIMAL_NODES} from '../../../index.js';
import {CardWrapper} from './../CardWrapper';
import {ToggleCard} from './ToggleCard';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Toggle card',
    component: ToggleCard,
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

const Template = ({display, heading, content, ...args}) => {
    const headingEditor = createEditor({nodes: MINIMAL_NODES});
    populateNestedEditor({editor: headingEditor, initialHtml: `<p>${heading}</p>`});

    const contentEditor = createEditor({nodes: BASIC_NODES});
    populateNestedEditor({editor: contentEditor, initialHtml: `<p>${content}</p>`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] py-10">
                <CardWrapper {...display}>
                    <ToggleCard {...display} {...args} contentEditor={contentEditor} headingEditor={headingEditor} />
                </CardWrapper>
            </div>
            <div className="w-full bg-black py-10">
                <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper {...display}>
                        <ToggleCard {...display} {...args} contentEditor={contentEditor} headingEditor={headingEditor} />
                    </CardWrapper>
                </div>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    content: '',
    contentPlaceholder: 'Collapsible content',
    display: 'Editing',
    heading: '',
    headingPlaceholder: 'Toggle header'
};

export const Populated = Template.bind({});
Populated.args = {
    content: 'Toggles allow you to create collapsible sections of content which is a great way to make your content less overwhelming and easy to navigate. A common example is an FAQ section, like this one.',
    contentPlaceholder: 'Collapsible content',
    display: 'Editing',
    heading: 'When should I use Toggles?',
    headingPlaceholder: 'Toggle header'
};

