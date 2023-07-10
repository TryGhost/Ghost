import React from 'react';
import {Slider} from './Slider';

const story = {
    title: 'Generic/Slider',
    component: Slider,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = args => (
    <Slider {...args} />
);

export const Default = Template.bind({});
Default.args = {
    min: 1,
    max: 10,
    value: 5,
    onChange: () => {}
};