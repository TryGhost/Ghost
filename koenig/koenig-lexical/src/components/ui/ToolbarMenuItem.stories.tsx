import React from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

import {ToolbarMenuItem} from './ToolbarMenu';

const story: Meta<typeof ToolbarMenuItem> = {
    title: 'Toolbar/Toolbar buttons',
    component: ToolbarMenuItem,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof ToolbarMenuItem> = (args) => {
    const [isActive, setActive] = React.useState(false);
    return (
        <div className="flex">
            <div className="rounded bg-black">
                <ToolbarMenuItem {...args} isActive={isActive} onClick={() => setActive(!isActive)} />
            </div>
        </div>
    );
};

export const Bold: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Bold.args = {
    icon: 'bold',
    label: 'Bold'
};

export const Italic: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Italic.args = {
    icon: 'italic',
    label: 'Italic'
};

export const HeadingTwo: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
HeadingTwo.args = {
    icon: 'headingTwo',
    label: 'Heading 2'
};

export const HeadingThree: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
HeadingThree.args = {
    icon: 'headingThree',
    label: 'Heading 3'
};

export const Quote: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Quote.args = {
    icon: 'quote',
    label: 'Quote'
};

export const QuoteOne: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
QuoteOne.args = {
    icon: 'quoteOne',
    label: 'Quote'
};

export const QuoteTwo: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
QuoteTwo.args = {
    icon: 'quoteTwo',
    label: 'Quote'
};

export const Link: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Link.args = {
    icon: 'link',
    label: 'Link'
};

export const ImgRegular: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
ImgRegular.args = {
    icon: 'imgRegular',
    label: 'Regular'
};

export const ImgWide: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
ImgWide.args = {
    icon: 'imgWide',
    label: 'Wide'
};

export const ImgFull: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
ImgFull.args = {
    icon: 'imgFull',
    label: 'Full size'
};

export const ImgReplace: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
ImgReplace.args = {
    icon: 'imgReplace',
    label: 'Replace'
};

export const Add: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Add.args = {
    icon: 'add',
    label: 'Add'
};

export const Edit: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Edit.args = {
    icon: 'edit',
    label: 'Edit'
};

export const Snippet: StoryFn<typeof ToolbarMenuItem> = Template.bind({});
Snippet.args = {
    icon: 'snippet',
    label: 'Snippet'
};