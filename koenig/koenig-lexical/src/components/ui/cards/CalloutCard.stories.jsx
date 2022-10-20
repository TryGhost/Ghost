import React from 'react';
import {CalloutCard} from './CalloutCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Callout Card',
    component: CalloutCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
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
    backgroundColor: 'green'
};

export const Value = Template.bind({});
Value.args = {
    isSelected: true,
    value: 'Something to pay attention to.',
    valuePlaceholder: 'Callout text...',
    backgroundColor: 'green'
};

