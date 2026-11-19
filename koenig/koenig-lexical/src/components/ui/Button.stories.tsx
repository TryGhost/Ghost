import {Button} from './Button';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Button> = {
    title: 'Generic/Button',
    component: Button,
    argTypes: {
        color: {
            options: ['white', 'grey', 'black', 'accent'],
            control: {type: 'select'}
        },
        size: {
            options: ['small', 'medium', 'large'],
            control: {type: 'select'}
        },
        width: {
            options: ['regular', 'full'],
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

const Template: StoryFn<typeof Button> = (args) => {
    return (
        <Button {...args} />
    );
};

export const Empty: StoryFn<typeof Button> = Template.bind({});
Empty.args = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: '',
    placeholder: 'Add button text'
};

export const Populated: StoryFn<typeof Button> = Template.bind({});
Populated.args = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: 'Subscribe',
    placeholder: 'Add button text',
    href: 'https://google.com/',
    target: '__blank'
};
