import React from 'react';
import {ButtonCard} from './ButtonCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Button card',
    component: ButtonCard,
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
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...args}>
                <ButtonCard {...args} />
            </CardWrapper>
        </div>
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