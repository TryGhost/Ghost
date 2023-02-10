import React from 'react';

import {LinkInput} from './LinkInput';

const story = {
    title: 'Toolbar/LinkInput',
    component: LinkInput,
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
            <LinkInput {...args} />
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