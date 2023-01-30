import React from 'react';
import {HorizontalRuleCard} from './HorizontalRuleCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Divider card',
    component: HorizontalRuleCard,
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
            type: 'functional'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <HorizontalRuleCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    display: 'Selected'
};

