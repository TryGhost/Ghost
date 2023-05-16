import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {CardWrapper} from './../CardWrapper';
import {HeaderCard} from './HeaderCard';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../.storybook/editorEmptyState';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Header card',
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
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = ({display, header, subheader, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});

    populateNestedEditor({editor: headerTextEditor, initialHtml: `<p>${header}</p>`});
    populateNestedEditor({editor: subheaderTextEditor, initialHtml: `<p>${subheader}</p>`});

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
    size: 'small',
    type: 'dark',
    header: '',
    headerPlaceholder: 'Enter heading text',
    subheader: '',
    subheaderPlaceholder: 'Enter subheading text',
    button: false,
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    buttonUrl: '',
    headerTextEditorInitialState: editorEmptyState,
    subheaderTextEditorInitialState: editorEmptyState
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    size: 'small',
    handleButtonToggle: () => {},
    header: 'This is a heading',
    headerPlaceholder: 'Enter heading text',
    subheader: 'And here is some subheading text.',
    subheaderPlaceholder: 'Enter subheading text',
    button: false,
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://ghost.org/',
    backgroundImageSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    type: 'image'
};

export const Loading = Template.bind({});
Loading.args = {
    display: 'Editing',
    size: 'small',
    handleButtonToggle: () => {},
    header: 'This is a heading',
    headerPlaceholder: 'Enter heading text',
    subheader: 'And here is some subheading text.',
    subheaderPlaceholder: 'Enter subheading text',
    button: false,
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://ghost.org/',
    backgroundImageSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    type: 'image',
    fileUploader: {
        isLoading: true,
        progress: 80
    }
};
