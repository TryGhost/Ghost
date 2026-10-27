import {ButtonCard} from './ButtonCard';
import {CardWrapper} from './../CardWrapper';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof ButtonCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Button card',
    component: ButtonCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        },
        alignment: {
            options: ['left', 'center'],
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper wrapperStyle='wide' {...displayOptions[display]} {...args}>
                <ButtonCard {...displayOptions[display]} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    alignment: 'center',
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    buttonUrl: ''
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    alignment: 'center',
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://ghost.org/'
};