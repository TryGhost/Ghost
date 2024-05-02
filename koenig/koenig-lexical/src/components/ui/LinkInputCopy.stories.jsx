import React from 'react';

import {LinkInputCopy} from './LinkInputCopy';

const story = {
    title: 'Toolbar/LinkInputCopy',
    component: LinkInputCopy,
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
            <LinkInputCopy {...args} />
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
