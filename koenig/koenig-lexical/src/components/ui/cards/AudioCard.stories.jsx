import React from 'react';
import {AudioCard} from './AudioCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Audio card',
    component: AudioCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
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
    isSelected: true,
    isPopulated: false,
    audioTitle: '',
    audioTitlePlaceholder: 'Add a title...',
    totalDuration: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    isPopulated: true,
    audioTitle: 'Audio file title',
    audioTitlePlaceholder: 'Add a title...',
    totalDuration: '0:27'
};
