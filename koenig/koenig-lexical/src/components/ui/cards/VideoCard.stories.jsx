import React from 'react';
import {VideoCard} from './VideoCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Video card',
    component: VideoCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <VideoCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    caption: ''
};

