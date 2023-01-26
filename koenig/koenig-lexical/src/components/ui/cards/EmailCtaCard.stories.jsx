import React from 'react';
import {EmailCtaCard} from './EmailCtaCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Email CTA card',
    component: EmailCtaCard,
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
            <CardWrapper wrapperStyle='wide' {...args}>
                <EmailCtaCard {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    visibility: 'Free members',
    alignment: 'left',
    separators: true,
    value: '',
    placeholder: 'Email only text... (optional)',
    button: true,
    buttonText: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    isEditing: true,
    visibility: 'Free members',
    alignment: 'center',
    separators: true,
    value: 'Want to get access to premium content?',
    placeholder: 'Email only text... (optional)',
    button: true,
    buttonText: 'Upgrade'
};

