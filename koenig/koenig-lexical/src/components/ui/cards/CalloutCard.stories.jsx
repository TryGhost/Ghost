import React from 'react';
import {CalloutCard} from './CalloutCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Callout card',
    component: CalloutCard,
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
    <div className="mx-auto my-8 w-[740px]">
        <CardWrapper {...args}>
            <CalloutCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    value: '',
    valuePlaceholder: 'Callout text...',
    backgroundColor: 'grey'
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    value: 'Something to pay attention to.',
    valuePlaceholder: 'Callout text...',
    backgroundColor: 'grey'
};

