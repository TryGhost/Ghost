import React from 'react';

import {Input} from './Input';

const story = {
    title: 'Generic/Input',
    component: Input,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <Input {...args} />
);

export const Default = Template.bind({});
