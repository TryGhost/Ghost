import React from 'react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor';
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
            type: 'Functional'
        }
    }
};
export default story;

const Template = ({display, heading, subheader, disclaimer, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});
    const disclaimerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const cardWidth = args.layout === 'split' ? 'full' : args.layout;

    populateEditor({editor: headerTextEditor, initialHtml: `${heading}`});
    populateEditor({editor: subheaderTextEditor, initialHtml: `${subheader}`});
    populateEditor({editor: disclaimerTextEditor, initialHtml: `${disclaimer}`});

    return (<div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...display} cardWidth={cardWidth}>
                <SignupCard
                    {...display}
                    {...args}
                    disclaimerTextEditor={disclaimerTextEditor}
                    headerTextEditor={headerTextEditor}
                    subheaderTextEditor={subheaderTextEditor}
                />
            </CardWrapper>
        </div>
    </div>);
};

export const Default = Template.bind({});
Default.args = {
    display: 'Editing',
    layout: 'wide',
    alignment: 'left',
    showBackgroundImage: false,
    heading: 'Sign up for Koenig Lexical',
    subheader: `There's a whole lot to discover in this editor. Let us help you settle in.`,
    disclaimer: 'No spam. Unsubscribe anytime.',
    buttonText: '',
    buttonColor: 'accent',
    buttonTextColor: '#FFFFFF',
    backgroundColor: '#F0F0F0',
    textColor: '#000000',
    availableLabels: ['First label', 'Second label']
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    layout: 'wide',
    alignment: 'left',
    showBackgroundImage: false,
    heading: '',
    subheader: '',
    disclaimer: '',
    buttonText: '',
    buttonColor: '#ffffff',
    buttonTextColor: '#000000',
    backgroundColor: 'transparent',
    textColor: '',
    availableLabels: ['First label', 'Second label'],
    headerTextEditorInitialState: editorEmptyState,
    subheaderTextEditorInitialState: editorEmptyState,
    disclaimerTextEditorInitialState: editorEmptyState
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    layout: 'split',
    alignment: 'left',
    showBackgroundImage: true,
    backgroundImageSrc: 'https://static.ghost.org/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
    heading: 'This is a heading',
    subheader: 'And here is some subheading text.',
    disclaimer: 'And here is some disclaimer text.',
    buttonText: 'Subscribe',
    buttonColor: '#000000',
    buttonTextColor: '#ffffff',
    backgroundColor: '#F3B389',
    textColor: '#000000',
    availableLabels: ['First label', 'Second label'],
    handleBackgroundColor: () => {}
};
