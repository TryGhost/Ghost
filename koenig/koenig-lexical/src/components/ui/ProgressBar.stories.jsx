import React from 'react';
import {ProgressBar} from './ProgressBar';

const story = {
    title: 'Generic/Progress bar',
    component: ProgressBar,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <ProgressBar {...args} />
);

export const Default = Template.bind({});
Default.args = {
    style: {width: 60 + '%'},
    fullWidth: false
};