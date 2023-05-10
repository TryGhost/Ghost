import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {CardWrapper} from './../CardWrapper';
import {MINIMAL_NODES} from '../../../index.js';
import {SignupCard} from './SignupCard';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Signup card',
    component: SignupCard,
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
        },
        cardWidth: {
            options: ['regular', 'wide', 'full'],
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = ({display, heading, subheader, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});

    populateNestedEditor({editor: headerTextEditor, initialHtml: `<p>${heading}</p>`});
    populateNestedEditor({editor: subheaderTextEditor, initialHtml: `<p>${subheader}</p>`});

    return (<div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...display} {...args}>
                <SignupCard
                    {...display}
                    {...args}
                    headerTextEditor={headerTextEditor}
                    subheaderTextEditor={subheaderTextEditor}
                />
            </CardWrapper>
        </div>
    </div>);
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    cardWidth: 'regular',
    alignment: 'center',
    type: 'dark',
    heading: '',
    headerPlaceholder: 'Enter heading text',
    subheader: '',
    subheaderPlaceholder: 'Enter subheading text',
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    splitLayout: false
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    cardWidth: 'regular',
    alignment: 'center',
    type: 'dark',
    heading: 'This is a heading',
    headerPlaceholder: 'Enter heading text',
    subheader: 'And here is some subheading text.',
    subheaderPlaceholder: 'Enter subheading text',
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    splitLayout: false
};