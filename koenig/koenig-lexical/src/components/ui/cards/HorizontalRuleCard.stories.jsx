import React from 'react';
import {HorizontalRuleCard} from './HorizontalRuleCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Divider card',
    component: HorizontalRuleCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <HorizontalRuleCard {...args} />
        </CardWrapper>
    </div>
);

export const Default = Template.bind({});
Default.args = {
    isSelected: true
};

