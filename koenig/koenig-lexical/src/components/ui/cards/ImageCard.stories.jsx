import React from 'react';
import {ImageCard} from './ImageCard';

const story = {
    title: 'Cards/Image Card',
    component: ImageCard,
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => <ImageCard {...args} />;

export const Default = Template.bind({});

