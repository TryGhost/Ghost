import React from 'react';
import {ToggleCard} from './ToggleCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/Toggle Card',
    component: ToggleCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <ToggleCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    header: '',
    headerPlaceholder: 'Toggle header',
    content: '',
    contentPlaceholder: 'Collapsible content'
};

export const WithText = Template.bind({});
WithText.args = {
    isSelected: true,
    header: 'When should I use Toggles?',
    headerPlaceholder: 'Toggle header',
    content: 'Toggles allow you to create collapsible sections of content which is a great way to make your content less overwhelming and easy to navigate. A common example is an FAQ section, like this one.',
    contentPlaceholder: 'Collapsible content'
};

