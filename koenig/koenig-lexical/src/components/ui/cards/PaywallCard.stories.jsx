import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {PaywallCard} from './PaywallCard';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Public preview card',
    component: PaywallCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected'
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
        <div className="mx-auto my-8 max-w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <PaywallCard {...display} />
            </CardWrapper>
        </div>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    display: 'Selected'
};

