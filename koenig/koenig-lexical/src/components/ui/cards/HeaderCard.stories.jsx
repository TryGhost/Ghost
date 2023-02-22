import React from 'react';
import {HeaderCard} from './HeaderCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Header card',
    component: HeaderCard,
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
        <div className="mx-auto my-8 w-full min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <HeaderCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    size: 'S',
    backgroundColor: 'dark',
    heading: '',
    headingPlaceholder: 'Enter heading text',
    subHeading: '',
    subHeadingPlaceholder: 'Enter subheading text',
    button: false,
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    buttonUrl: ''
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    size: 'S',
    backgroundColor: 'dark',
    heading: 'This is a heading',
    headingPlaceholder: 'Enter heading text',
    subHeading: 'And here is some subheading text.',
    subHeadingPlaceholder: 'Enter subheading text',
    button: false,
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://ghost.org/'
};

