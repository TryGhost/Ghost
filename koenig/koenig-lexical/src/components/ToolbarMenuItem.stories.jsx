import React from 'react';

import {ToolbarMenuItem} from './ToolbarMenu';

export default {
    title: 'Generic/Toolbar menu item',
    component: ToolbarMenuItem
};

const Template = args => (
    <ToolbarMenuItem {...args} />
);

export const Bold = Template.bind({});
Bold.args = {
    icon: 'bold'
};

export const Italic = Template.bind({});
Italic.args = {
    icon: 'italic'
};

export const HeadingOne = Template.bind({});
HeadingOne.args = {
    icon: 'headingOne'
};

export const HeadingTwo = Template.bind({});
HeadingTwo.args = {
    icon: 'headingTwo'
};

export const QuoteOne = Template.bind({});
QuoteOne.args = {
    icon: 'quoteOne'
};

export const QuoteTwo = Template.bind({});
QuoteTwo.args = {
    icon: 'quoteTwo'
};