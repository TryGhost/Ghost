import React from 'react';

import {Toggle} from './Toggle';

const story = {
    title: 'Generic/Toggle',
    component: Toggle,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = args => (
    <Toggle {...args} />
);

export const Default = Template.bind({});
Default.args = {
    isChecked: true
};
