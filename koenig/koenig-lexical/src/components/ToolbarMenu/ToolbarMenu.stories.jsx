import React from 'react';

import {ToolbarMenu} from './ToolbarMenu';
import {ToolbarMenuSeparator} from './ToolbarMenu';

import {Bold} from './ToolbarMenuItem.stories';
import {Italic} from './ToolbarMenuItem.stories';
import {HeadingOne} from './ToolbarMenuItem.stories';
import {HeadingTwo} from './ToolbarMenuItem.stories';
import {QuoteOne} from './ToolbarMenuItem.stories';

export default {
    title: 'Generic/Toolbar menu',
    component: ToolbarMenu,
    subcomponents: {ToolbarMenuSeparator}
};

const Template = args => <ToolbarMenu {...args} />;

export const Text = Template.bind({});
Text.args = {
    children: [
        <Bold {...Bold.args} />, 
        <Italic {...Italic.args} />, 
        <HeadingOne {...HeadingOne.args} />,
        <HeadingTwo {...HeadingTwo.args} />,
        <ToolbarMenuSeparator />,
        <QuoteOne {...QuoteOne.args} />
    ]
};