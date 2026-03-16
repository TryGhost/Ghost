import populateEditor from '../../../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from '../../../CardWrapper';
import {HeaderCard} from './HeaderCard';
import {MINIMAL_NODES} from '../../../../../index';
import {createEditor} from 'lexical';
import {editorEmptyState} from '../../../../../../.storybook/editorEmptyState';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof HeaderCard> & {display: keyof typeof displayOptions; header?: string; subheader?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Header card v1',
    component: HeaderCard,
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

const Template: StoryFn<StoryArgs> = ({display, header, subheader, ...args}) => {
    const headerTextEditor = createEditor({nodes: MINIMAL_NODES});
    const subheaderTextEditor = createEditor({nodes: MINIMAL_NODES});

    populateEditor({editor: headerTextEditor, initialHtml: `${header}`});
    populateEditor({editor: subheaderTextEditor, initialHtml: `${subheader}`});

    return (<div className="kg-prose">
        <div className="mx-auto my-8 w-full min-w-[initial]">
            <CardWrapper {...displayOptions[display]} {...args}>
                <HeaderCard
                    {...displayOptions[display]}
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

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    size: 'small',
    type: 'dark',
    header: '',
    subheader: '',
    button: false,
    buttonText: '',
    buttonUrl: '',
    headerTextEditorInitialState: editorEmptyState,
    subheaderTextEditorInitialState: editorEmptyState
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    size: 'small',
    handleButtonToggle: () => {},
    header: 'This is a heading',
    subheader: 'And here is some subheading text.',
    button: false,
    buttonText: 'Subscribe',
    buttonUrl: 'https://ghost.org/',
    backgroundImageSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    type: 'image'
};

export const Loading: StoryFn<StoryArgs> = Template.bind({});
Loading.args = {
    display: 'Editing',
    size: 'small',
    handleButtonToggle: () => {},
    header: 'This is a heading',
    subheader: 'And here is some subheading text.',
    button: false,
    buttonText: 'Subscribe',
    buttonUrl: 'https://ghost.org/',
    backgroundImageSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    type: 'image',
    fileUploader: {
        isLoading: true,
        progress: 80
    }
};
