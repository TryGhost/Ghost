import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor.js';
import {BASIC_NODES, MINIMAL_NODES} from '../../../index.js';
import {CardWrapper} from './../CardWrapper';
import {ProductCard} from './ProductCard';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Product card',
    component: ProductCard,
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

const Template = ({display, title, description, ...args}) => {
    const titleEditor = createEditor({nodes: MINIMAL_NODES});
    populateNestedEditor({editor: titleEditor, initialHtml: `<p>${title}</p>`});

    const descriptionEditor = createEditor({nodes: BASIC_NODES});
    populateNestedEditor({editor: descriptionEditor, initialHtml: `<p>${description}</p>`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <div className="flex justify-center p-3">
                        <ProductCard {...display} {...args} descriptionEditor={descriptionEditor} titleEditor={titleEditor} />
                    </div>
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    image: false,
    title: '',
    description: '',
    isRatingEnabled: false,
    isButtonEnabled: false,
    buttonText: '',
    buttonUrl: '',
    imgMimeTypes: ['image/*']
};

export const Uploading = Template.bind({});
Uploading.args = {
    display: 'Editing',
    image: true,
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

export const DraggedOver = Template.bind({});
DraggedOver.args = {
    display: 'Editing',
    image: true,
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

export const Error = Template.bind({});
Error.args = {
    display: 'Editing',
    image: true,
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

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    image: true,
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
