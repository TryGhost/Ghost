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
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...args}>
                <AudioCard {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    audioTitle: '',
    audioTitlePlaceholder: 'Add a title...',
    totalDuration: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    isPopulated: true,
    isEditing: true,
    audioTitle: 'Audio file title',
    audioTitlePlaceholder: 'Add a title...',
    totalDuration: '0:27'
};
