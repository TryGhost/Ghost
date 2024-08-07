import React from 'react';

import {LinkInputWithSearch} from './LinkInputWithSearch';

const story = {
    title: 'Toolbar/LinkInputWithSearch',
    component: LinkInputWithSearch,
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
            <LinkInputWithSearch {...args} />
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    href: ''
};

export const Populated = Template.bind({});
Populated.args = {
    href: 'https://ghost.org'
};
