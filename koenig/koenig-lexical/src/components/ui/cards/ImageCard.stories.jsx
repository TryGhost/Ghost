import React from 'react';
import {ImageCard} from './ImageCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Image Card',
    component: ImageCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
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

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    src: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
    setAltText: true,
    caption: 'Welcome to your new Ghost publication',
    altText: 'Feature image',
    isDraggedOver: false
};

