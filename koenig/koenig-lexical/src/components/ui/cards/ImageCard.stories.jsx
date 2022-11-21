import React from 'react';
import {ImageCard} from './ImageCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Image card',
    component: ImageCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'},
        cardWidth: {
            options: ['regular', 'wide', 'full'],
            control: {type: 'radio'}
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[740px] mx-auto">
        <CardWrapper {...args}>
            <ImageCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    setAltText: true,
    caption: '',
    altText: '',
    isDraggedOver: false
};

export const inProgress = Template.bind({});
inProgress.args = {
    isSelected: true,
    setAltText: true,
    caption: '',
    altText: '',
    cardWidth: 'regular',
    isDraggedOver: false,
    previewSrc: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    uploadProgress: 50
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    src: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    setAltText: true,
    caption: 'Welcome to your new Ghost publication',
    altText: 'Feature image',
    cardWidth: 'regular',
    isDraggedOver: false
};
