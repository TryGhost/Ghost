import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {EmailCtaCard} from './EmailCtaCard';
import {ReactComponent as EmailIndicatorIcon} from '../../../assets/icons/kg-indicator-email.svg';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Email CTA card',
    component: EmailCtaCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        }    
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                <EmailCtaCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    visibility: 'Free members',
    alignment: 'left',
    separators: true,
    value: '',
    placeholder: 'Email only text... (optional)',
    button: true,
    buttonText: '',
    buttonUrl: ''
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    visibility: 'Free members',
    alignment: 'center',
    separators: true,
    value: 'Want to get access to premium content?',
    placeholder: 'Email only text... (optional)',
    button: true,
    buttonText: 'Upgrade',
    buttonUrl: 'https://ghost.org/'
};

