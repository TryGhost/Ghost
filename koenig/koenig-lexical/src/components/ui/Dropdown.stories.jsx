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
Default.args = {
    label: 'Visibility',
    description: 'Visible for this audience when delivered by email. This card is not published on your site.',
    trigger: 'Free members',
    menu: ['Free members', 'Paid members']
};
