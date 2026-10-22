import {ToolbarMenu} from './ToolbarMenu';
import {ToolbarMenuSeparator} from './ToolbarMenu';
import type {Meta, StoryFn} from '@storybook/react-vite';
import type {ToolbarMenuItemProps} from './ToolbarMenu';

import {Add} from './ToolbarMenuItem.stories';
import {Bold} from './ToolbarMenuItem.stories';
import {Edit} from './ToolbarMenuItem.stories';
import {HeadingThree} from './ToolbarMenuItem.stories';
import {HeadingTwo} from './ToolbarMenuItem.stories';
import {ImgFull} from './ToolbarMenuItem.stories';
import {ImgRegular} from './ToolbarMenuItem.stories';
import {ImgReplace} from './ToolbarMenuItem.stories';
import {ImgWide} from './ToolbarMenuItem.stories';
import {Italic} from './ToolbarMenuItem.stories';
import {Link} from './ToolbarMenuItem.stories';
import {Quote} from './ToolbarMenuItem.stories';
import {Snippet} from './ToolbarMenuItem.stories';

const story: Meta<typeof ToolbarMenu> = {
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

const Template: StoryFn<typeof ToolbarMenu> = (args) => {
    return (
        <div className="flex">
            <ToolbarMenu {...args} />
        </div>
    );
};

export const Text: StoryFn<typeof ToolbarMenu> = Template.bind({});
Text.args = {
    children: [
        <Bold key='bold' {...(Bold.args as ToolbarMenuItemProps)} />,
        <Italic key='italic' {...(Italic.args as ToolbarMenuItemProps)} />,
        <HeadingTwo key='heading-two' {...(HeadingTwo.args as ToolbarMenuItemProps)} />,
        <HeadingThree key='heading-three' {...(HeadingThree.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-1' />,
        <Quote key='quote' {...(Quote.args as ToolbarMenuItemProps)} />,
        <Link key='link' {...(Link.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-2' />,
        <Snippet key='snippet' {...(Snippet.args as ToolbarMenuItemProps)} />
    ]
};

export const Image: StoryFn<typeof ToolbarMenu> = Template.bind({});
Image.args = {
    children: [
        <ImgRegular key='img-regular' {...(ImgRegular.args as ToolbarMenuItemProps)} />,
        <ImgWide key='img-wide' {...(ImgWide.args as ToolbarMenuItemProps)} />,
        <ImgFull key='img-full' {...(ImgFull.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-1' />,
        <Link key='link' {...(Link.args as ToolbarMenuItemProps)} />,
        <ImgReplace key='img-replace' {...(ImgReplace.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-2' />,
        <Snippet key='snippet' {...(Snippet.args as ToolbarMenuItemProps)} />
    ]
};

export const Gallery: StoryFn<typeof ToolbarMenu> = Template.bind({});
Gallery.args = {
    children: [
        <Add key='add' {...(Add.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-1' />,
        <Snippet key='snippet' {...(Snippet.args as ToolbarMenuItemProps)} />
    ]
};

export const EditableCards: StoryFn<typeof ToolbarMenu> = Template.bind({});
EditableCards.args = {
    children: [
        <Edit key='edit' {...(Edit.args as ToolbarMenuItemProps)} />,
        <ToolbarMenuSeparator key='sep-1' />,
        <Snippet key='snippet' {...(Snippet.args as ToolbarMenuItemProps)} />
    ]
};

export const NonEditableCards: StoryFn<typeof ToolbarMenu> = Template.bind({});
NonEditableCards.args = {
    children: [
        <Snippet key='snippet' {...(Snippet.args as ToolbarMenuItemProps)} />
    ]
};
