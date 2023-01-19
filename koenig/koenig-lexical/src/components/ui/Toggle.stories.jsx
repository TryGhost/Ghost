import React from 'react';

import {Toggle} from './Toggle';

const story = {
    title: 'Generic/Toggle',
    component: Toggle,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <Toggle {...args} />
);

export const Default = Template.bind({});
