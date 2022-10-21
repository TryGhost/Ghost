import React from 'react';

import {ToolbarMenu} from './ToolbarMenu';
import {ToolbarMenuSeparator} from './ToolbarMenu';

import {Bold} from './ToolbarMenuItem.stories';
import {Italic} from './ToolbarMenuItem.stories';
import {HeadingOne} from './ToolbarMenuItem.stories';
import {HeadingTwo} from './ToolbarMenuItem.stories';
import {Quote} from './ToolbarMenuItem.stories';
import {Link} from './ToolbarMenuItem.stories';
import {ImageRegular} from './ToolbarMenuItem.stories';
import {ImageWide} from './ToolbarMenuItem.stories';
import {ImageFull} from './ToolbarMenuItem.stories';
import {ImageReplace} from './ToolbarMenuItem.stories';
import {Snippet} from './ToolbarMenuItem.stories';

const story = {
    title: 'Toolbar/Toolbar',
    component: ToolbarMenu,
    subcomponents: {ToolbarMenuSeparator}
};
export default story;

const Template = args => <ToolbarMenu {...args} />;

export const Text = Template.bind({});
Text.args = {
    children: [
        <Bold {...Bold.args} />,
        <Italic {...Italic.args} />,
        <HeadingOne {...HeadingOne.args} />,
        <HeadingTwo {...HeadingTwo.args} />,
        <ToolbarMenuSeparator />,
        <Quote {...Quote.args} />,
        <Link {...Link.args} />,
        <ToolbarMenuSeparator />,
        <Snippet {...Snippet.args} />
    ]
};

export const Image = Template.bind({});
Image.args = {
    children: [
        <ImageRegular {...ImageRegular.args} />,
        <ImageWide {...ImageWide.args} />,
        <ImageFull {...ImageFull.args} />,
        <ToolbarMenuSeparator />,
        <Link {...Link.args} />,
        <ImageReplace {...ImageReplace.args} />,
        <ToolbarMenuSeparator />,
        <Snippet {...Snippet.args} />
    ]
};