import React from 'react';

import {Dropdown} from './Dropdown';

const story = {
    title: 'Generic/Dropdown',
    component: Dropdown,
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[240px]">
        <Dropdown {...args} />
    </div>
);

export const Default = Template.bind({});
