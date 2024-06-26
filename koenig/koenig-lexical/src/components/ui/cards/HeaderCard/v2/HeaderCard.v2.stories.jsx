import React from 'react';
import populateEditor from '../../../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from '../../../CardWrapper';
import {HeaderCard} from './HeaderCard';
import {MINIMAL_NODES} from '../../../../../index.js';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../../../.storybook/editorEmptyState';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Header card v2',
    component: HeaderCard,
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

const Template = ({display, header, subheader, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});

    populateEditor({editor: headerTextEditor, initialHtml: `${header}`});
    populateEditor({editor: subheaderTextEditor, initialHtml: `${subheader}`});

    return (<div className="kg-prose">
        <div className="mx-auto my-8 w-full min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <HeaderCard
                    {...display}
                    {...args}
                    header={header}
                    headerTextEditor={headerTextEditor}
                    subheader={subheader}
                    subheaderTextEditor={subheaderTextEditor}
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
    backgroundImageSrc: 'https://static.ghost.org/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
    header: '',
    subheader: '',
    buttonText: '',
    buttonColor: '#000000',
    buttonTextColor: '#ffffff',
    backgroundColor: '#F3B389',
    textColor: '#000000',
    buttonUrl: '',
    handleBackgroundColor: () => {},
    headerTextEditorInitialState: editorEmptyState,
    subheaderTextEditorInitialState: editorEmptyState
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    layout: 'split',
    alignment: 'center',
    showBackgroundImage: true,
    backgroundImageSrc: 'https://static.ghost.org/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
    header: 'This is a heading',
    subheader: 'And here is some subheading text.',
    buttonEnabled: true,
    buttonText: 'Click Me',
    buttonColor: '#000000',
    buttonTextColor: '#ffffff',
    backgroundColor: '#F3B389',
    textColor: '#000000',
    buttonUrl: 'https://ghost.org/',
    handleBackgroundColor: () => {}
};

