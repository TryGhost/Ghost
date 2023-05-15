import React from 'react';

import {Button} from './Button';

const story = {
    title: 'Generic/Button',
    component: Button,
    argTypes: {
        color: {
            options: ['white', 'grey', 'black', 'accent'],
            control: {type: 'radio'}
        },
        size: {
            options: ['small', 'medium', 'large', 'xlarge'],
            control: {type: 'radio'}
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

const Template = (args) => {
    return (
        <Button {...args} />
    );
};

export const Empty = Template.bind({});
Empty.args = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: '',
    placeholder: 'Add button text'
};

export const Populated = Template.bind({});
Populated.args = {
    color: 'accent',
    size: 'small',
    width: 'regular',
    value: 'Subscribe',
    placeholder: 'Add button text',
    href: 'https://google.com/',
    target: '__blank'
};
