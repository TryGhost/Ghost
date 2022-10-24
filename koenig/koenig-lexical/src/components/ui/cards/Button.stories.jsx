import React from 'react';

import {Button} from './ButtonCard';

const story = {
    title: 'Generic/Button',
    component: Button
};
export default story;

const Template = (args) => {
    return (
        <Button {...args} />
    );
};

export const Empty = Template.bind({});
Empty.args = {
    value: '',
    valuePlaceholder: 'Add button text'
};

export const Value = Template.bind({});
Value.args = {
    value: 'Subscribe',
    valuePlaceholder: 'Add button text'
};