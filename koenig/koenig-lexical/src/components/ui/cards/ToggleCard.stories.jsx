import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {ToggleCard} from './ToggleCard';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Toggle card',
    component: ToggleCard,
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
        <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] py-10">
            <CardWrapper {...display} {...args}>
                <ToggleCard {...display} {...args} />
            </CardWrapper>
        </div>
        <div className="w-full bg-black py-10">
            <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...display} {...args}>
                    <ToggleCard {...display} {...args} />
                </CardWrapper>
            </div>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    header: '',
    headerPlaceholder: 'Toggle header',
    content: '',
    contentPlaceholder: 'Collapsible content'
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    header: 'When should I use Toggles?',
    headerPlaceholder: 'Toggle header',
    content: 'Toggles allow you to create collapsible sections of content which is a great way to make your content less overwhelming and easy to navigate. A common example is an FAQ section, like this one.',
    contentPlaceholder: 'Collapsible content'
};

