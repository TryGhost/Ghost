import React from 'react';
import {EmailCtaCard} from './EmailCtaCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Email CTA Card',
    component: EmailCtaCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[764px]">
        <CardWrapper {...args}>
            <EmailCtaCard {...args} />
        </CardWrapper>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true,
    visibility: 'Free members',
    alignment: 'left',
    separators: true,
    value: '',
    placeholder: 'Email only text... (optional)',
    button: true,
    buttonText: ''
};

