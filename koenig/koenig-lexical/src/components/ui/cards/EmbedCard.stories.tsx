import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from './../CardWrapper';
import {EmbedCard} from './EmbedCard';
import {MINIMAL_NODES} from '../../../index';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

type StoryArgs = ComponentProps<typeof EmbedCard> & {display: keyof typeof displayOptions; caption?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Embed card',
    component: EmbedCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected'
                },
                defaultValue: displayOptions.Default
            }
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, caption, ...args}) => {
    const captionEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: captionEditor, initialHtml: `${caption}`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] p-4">
                <CardWrapper {...displayOptions[display]} {...args}>
                    <EmbedCard {...displayOptions[display]} {...args} captionEditor={captionEditor} />
                </CardWrapper>
            </div>
            <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px] bg-black p-4">
                <CardWrapper {...displayOptions[display]} {...args}>
                    <EmbedCard {...displayOptions[display]} {...args} captionEditor={captionEditor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Selected',
    urlInputValue: '',
    urlPlaceholder: 'Paste URL to add embedded content...'
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Selected',
    html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
};

export const WithCaption: StoryFn<StoryArgs> = Template.bind({});
WithCaption.args = {
    display: 'Selected',
    caption: 'This is a caption',
    html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
};
