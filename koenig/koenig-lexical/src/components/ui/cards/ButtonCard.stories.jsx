import React from 'react';
import {ButtonCard} from './ButtonCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Button card',
    component: ButtonCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <ButtonCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    buttonText: '',
    buttonPlaceholder: 'Add button text'
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text'
};