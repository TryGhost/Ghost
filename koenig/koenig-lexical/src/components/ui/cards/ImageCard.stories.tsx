import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from './../CardWrapper';
import {ImageCard} from './ImageCard';
import {MINIMAL_NODES} from '../../../index';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

type StoryArgs = ComponentProps<typeof ImageCard> & {display: keyof typeof displayOptions; caption?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Image card',
    component: ImageCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected'
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
                <CardWrapper {...displayOptions[display]} {...args}>
                    <ImageCard {...displayOptions[display]} {...args} captionEditor={captionEditor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Selected',
    caption: '',
    altText: '',
    imageUploader: {
        isLoading: false,
        progress: 100
    },
    imageFileDragHandler: {
        isDraggedOver: false
    }
};

export const Uploading: StoryFn<StoryArgs> = Template.bind({});
Uploading.args = {
    display: 'Selected',
    cardWidth: 'regular',
    caption: '',
    altText: '',
    previewSrc: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    imageUploader: {
        progress: 50,
        isLoading: true
    },
    imageFileDragHandler: {
        isDraggedOver: false
    }
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Selected',
    cardWidth: 'regular',
    src: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    caption: 'Welcome to your new Ghost publication',
    altText: 'Feature image',
    imageUploader: {
        isLoading: false,
        progress: 100
    },
    imageFileDragHandler: {
        isDraggedOver: false
    }
};

export const Errors: StoryFn<StoryArgs> = Template.bind({});
Errors.args = {
    display: 'Selected',
    cardWidth: 'regular',
    caption: '',
    altText: '',
    imageUploader: {
        errors: [{message: 'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP'}]
    },
    imageFileDragHandler: {
        isDraggedOver: false
    }
};

export const DraggedOver: StoryFn<StoryArgs> = Template.bind({});
DraggedOver.args = {
    display: 'Selected',
    cardWidth: 'regular',
    caption: '',
    altText: '',
    imageUploader: {
        errors: [{message: 'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP'}]
    },
    imageFileDragHandler: {
        isDraggedOver: true
    }
};
