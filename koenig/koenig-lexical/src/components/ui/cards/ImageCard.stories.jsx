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
        <CardWrapper>
            <ImageCard {...args} />
        </CardWrapper>
    </div>
);

export const Default = Template.bind({});

