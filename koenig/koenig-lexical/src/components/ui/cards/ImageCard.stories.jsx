import React from 'react';
import {ImageCard} from './ImageCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Image card',
    component: ImageCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
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

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <ImageCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
    setAltText: true,
    caption: '',
    altText: '',
    isDraggedOver: false
};

export const Uploading = Template.bind({});
Uploading.args = {
    display: 'Selected',
    cardWidth: 'regular',
    setAltText: true,
    caption: '',
    altText: '',
    isDraggedOver: false,
    previewSrc: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    uploadProgress: 50
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Selected',
    cardWidth: 'regular',
    src: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    setAltText: true,
    caption: 'Welcome to your new Ghost publication',
    altText: 'Feature image',
    isDraggedOver: false
};

export const Errors = Template.bind({});
Errors.args = {
    display: 'Selected',
    cardWidth: 'regular',
    setAltText: true,
    caption: '',
    altText: '',
    imageUploadErrors: [{message: 'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP'}]
};
