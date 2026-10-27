import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {BASIC_NODES, MINIMAL_NODES} from '../../../index';
import {CardWrapper} from './../CardWrapper';
import {ProductCard} from './ProductCard';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof ProductCard> & {display: keyof typeof displayOptions; title?: string; description?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Product card',
    component: ProductCard,
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

const Template: StoryFn<StoryArgs> = ({display, title, description, ...args}) => {
    const titleEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: titleEditor, initialHtml: `${title}`});

    const descriptionEditor = createEditor({nodes: BASIC_NODES});
    populateEditor({editor: descriptionEditor, initialHtml: `${description}`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...displayOptions[display]} {...args}>
                    <div className="flex justify-center p-3">
                        <ProductCard
                            {...args}
                            descriptionEditor={descriptionEditor}
                            isEditing={displayOptions[display].isEditing}
                            titleEditor={titleEditor}
                        />
                    </div>
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    title: '',
    description: '',
    isRatingEnabled: false,
    isButtonEnabled: false,
    buttonText: '',
    buttonUrl: '',
    imgMimeTypes: ['image/*']
};

export const Uploading: StoryFn<StoryArgs> = Template.bind({});
Uploading.args = {
    display: 'Editing',
    title: 'Fujifilm X100V',
    description: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    isRatingEnabled: false,
    isButtonEnabled: false,
    buttonText: 'Get it now',
    buttonUrl: 'https://ghost.org/',
    rating: 5,
    imgMimeTypes: ['image/*'],
    imgSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    imgUploader: {
        isLoading: true
    }
};

export const DraggedOver: StoryFn<StoryArgs> = Template.bind({});
DraggedOver.args = {
    display: 'Editing',
    title: 'Fujifilm X100V',
    description: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    isRatingEnabled: false,
    isButtonEnabled: false,
    buttonText: 'Get it now',
    buttonUrl: 'https://ghost.org/',
    rating: 5,
    imgMimeTypes: ['image/*'],
    imgSrc: '',
    imgDragHandler: {
        isDraggedOver: true
    }
};

export const Error: StoryFn<StoryArgs> = Template.bind({});
Error.args = {
    display: 'Editing',
    title: 'Fujifilm X100V',
    description: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    isRatingEnabled: false,
    isButtonEnabled: false,
    buttonText: 'Get it now',
    buttonUrl: 'https://ghost.org/',
    rating: 5,
    imgMimeTypes: ['image/*'],
    imgSrc: '',
    imgUploader: {
        errors: [{message: 'This file type is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP'}]
    }
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    title: 'Fujifilm X100V',
    description: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    isRatingEnabled: true,
    isButtonEnabled: true,
    buttonText: 'Get it now',
    buttonUrl: 'https://ghost.org/',
    rating: 4,
    imgMimeTypes: ['image/*'],
    imgSrc: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg'
};
