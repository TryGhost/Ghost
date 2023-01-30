import React from 'react';
import {ButtonCard} from './ButtonCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Button card',
    component: ButtonCard,
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
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <ButtonCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    buttonUrl: ''
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://ghost.org/'
};