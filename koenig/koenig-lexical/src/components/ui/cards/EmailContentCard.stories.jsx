import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {EmailContentCard} from './EmailContentCard';
import {ReactComponent as EmailIndicatorIcon} from '../../../assets/icons/kg-indicator-email.svg';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Email content card',
    component: EmailContentCard,
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
            type: 'uiBlocked'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                <EmailContentCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    display: 'Editing',
    value: 'Hey {first_name, "there"},',
    placeholder: 'Email only text...'
};

