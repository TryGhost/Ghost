import React from 'react';

import {Toolbar} from './Toolbar';

export default {
    title: 'Generic/Toolbar',
    component: Toolbar
};

const Template = args => (
    <Toolbar {...args} />
);

export const Text = Template.bind({});
Text.args = {
    selection: 'text'
};

export const Image = Template.bind({});
Image.args = {
    selection: 'image'
};

export const Gallery = Template.bind({});
Gallery.args = {
    selection: 'gallery'
};