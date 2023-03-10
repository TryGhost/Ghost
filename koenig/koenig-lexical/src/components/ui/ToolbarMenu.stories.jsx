/* eslint-disable react/jsx-key */
import React from 'react';

import {ToolbarMenu} from './ToolbarMenu';
import {ToolbarMenuSeparator} from './ToolbarMenu';

import {Add} from './ToolbarMenuItem.stories';
import {Bold} from './ToolbarMenuItem.stories';
import {Edit} from './ToolbarMenuItem.stories';
import {HeadingOne} from './ToolbarMenuItem.stories';
import {HeadingTwo} from './ToolbarMenuItem.stories';
import {ImageFull} from './ToolbarMenuItem.stories';
import {ImageRegular} from './ToolbarMenuItem.stories';
import {ImageReplace} from './ToolbarMenuItem.stories';
import {ImageWide} from './ToolbarMenuItem.stories';
import {Italic} from './ToolbarMenuItem.stories';
import {Link} from './ToolbarMenuItem.stories';
import {Quote} from './ToolbarMenuItem.stories';
import {Snippet} from './ToolbarMenuItem.stories';

const story = {
    title: 'Toolbar/Toolbar',
    component: ToolbarMenu,
    subcomponents: {ToolbarMenuSeparator},
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
            <ToolbarMenu {...args} />
        </div>
    );
};

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

export const Gallery = Template.bind({});
Gallery.args = {
    children: [
        <Add {...Add.args} />,
        <ToolbarMenuSeparator />,
        <Snippet {...Snippet.args} />
    ]
};

export const EditableCards = Template.bind({});
EditableCards.args = {
    children: [
        <Edit {...Edit.args} />,
        <ToolbarMenuSeparator />,
        <Snippet {...Snippet.args} />
    ]
};

export const NonEditableCards = Template.bind({});
NonEditableCards.args = {
    children: [
        <Snippet {...Snippet.args} />
    ]
};
