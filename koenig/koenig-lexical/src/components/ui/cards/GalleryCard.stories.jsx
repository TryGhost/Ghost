import React from 'react';
import {GalleryCard} from './GalleryCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Gallery Card',
    component: GalleryCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[1170px]">
        <CardWrapper {...args}>
            <GalleryCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    caption: ''
};

