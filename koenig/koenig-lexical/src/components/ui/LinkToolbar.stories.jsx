/* eslint-disable react/jsx-key */
import React from 'react';

import {LinkToolbar} from './LinkToolbar';

const story = {
    title: 'Toolbar/LinkToolbar',
    component: LinkToolbar,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = (args) => {
    return (
        <div className="flex">
            <LinkToolbar {...args} />
        </div>
    );
};

export const Base = Template.bind({});
Base.args = {
    href: 'https://ghost.org/'
};
