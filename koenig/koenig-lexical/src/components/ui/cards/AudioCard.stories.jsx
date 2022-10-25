import React from 'react';
import {AudioCard} from './AudioCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Audio Card',
    component: AudioCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <AudioCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true
};

