import React from 'react';
import {EmailContentCard} from './EmailContentCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Email Content Card',
    component: EmailContentCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[764px]">
        <CardWrapper {...args}>
            <EmailContentCard {...args} />
        </CardWrapper>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true,
    value: 'Hey {first_name, "there"},',
    placeholder: 'Email only text...'
};

