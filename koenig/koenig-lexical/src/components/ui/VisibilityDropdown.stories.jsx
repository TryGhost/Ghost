import React from 'react';

import {VisibilityDropdown} from './VisibilityDropdown';

const story = {
    title: 'Generic/Visibility dropdown',
    component: VisibilityDropdown,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <VisibilityDropdown {...args} />
);

export const Default = Template.bind({});
Default.args = {
    isChecked: true
};
