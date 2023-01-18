import React from 'react';
import {PaywallCard} from './PaywallCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Public preview card',
    component: PaywallCard,
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
            <PaywallCard />
        </CardWrapper>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true
};

