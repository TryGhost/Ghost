import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {CardWrapper} from './../CardWrapper';
import {MINIMAL_NODES} from '../../../index.js';
import {SignupCard} from './SignupCard';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../.storybook/editorEmptyState';

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
        layout: {
            options: ['regular', 'wide', 'full', 'split'],
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

const Template = ({display, heading, subheader, disclaimer, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});
    const disclaimerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const cardWidth = args.layout === 'split' ? 'full' : args.layout;

    populateNestedEditor({editor: headerTextEditor, initialHtml: `<p>${heading}</p>`});
    populateNestedEditor({editor: subheaderTextEditor, initialHtml: `<p>${subheader}</p>`});
    populateNestedEditor({editor: disclaimerTextEditor, initialHtml: `<p>${disclaimer}</p>`});

    return (<div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...display} {...args} cardWidth={cardWidth}>
                <SignupCard
                    {...display}
                    {...args}
                    disclaimerTextEditor={disclaimerTextEditor}
                    disclaimerTextEditorInitialState={editorEmptyState}
                    headerTextEditor={headerTextEditor}
                    headerTextEditorInitialState={editorEmptyState}
                    subheaderTextEditor={subheaderTextEditor}
                    subheaderTextEditorInitialState={editorEmptyState}
                />
            </CardWrapper>
        </div>
    </div>);
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    layout: 'regular',
    alignment: 'center',
    showBackgroundImage: false,
    heading: '',
    subheader: '',
    disclaimer: '',
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    availableLabels: [{id: '1',name: 'First label'},{id: '2',name: 'Second label'}]
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    layout: 'regular',
    alignment: 'center',
    showBackgroundImage: true,
    backgroundImageSrc: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    heading: 'This is a heading',
    subheader: 'And here is some subheading text.',
    disclaimer: 'And here is some disclaimer text.',
    buttonText: 'Subscribe',
    buttonColor: '#f7f7f7',
    backgroundColor: '#444444',
    availableLabels: [{id: '1',name: 'First label'},{id: '2',name: 'Second label'}]
};
