import React from 'react';
import {GalleryCard} from './GalleryCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Gallery card',
    component: GalleryCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = args => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[1170px] min-w-[initial]">
            <CardWrapper {...args}>
                <GalleryCard {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    caption: ''
};

