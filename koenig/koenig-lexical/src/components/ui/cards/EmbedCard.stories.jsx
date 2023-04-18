import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {CardWrapper} from './../CardWrapper';
import {EmbedCard} from './EmbedCard';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Embed card',
    component: EmbedCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
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

const Template = ({display, caption, ...args}) => {
    const captionEditor = createEditor({nodes: MINIMAL_NODES});
    populateNestedEditor({editor: captionEditor, initialHtml: `<p>${caption}</p>`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] p-4">
                <CardWrapper {...display} {...args}>
                    <EmbedCard {...display} {...args} captionEditor={captionEditor} />
                </CardWrapper>
            </div>
            <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px] bg-black p-4">
                <CardWrapper {...display} {...args}>
                    <EmbedCard {...display} {...args} captionEditor={captionEditor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
    url: '',
    urlPlaceholder: 'Paste URL to add embedded content...'
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Selected',
    url: 'https://ghost.org/',
    embedType: 'video',
    html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
    metadata: {
        html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
        thumbnail_width: 480,
        width: 480,
        author_url: 'https://www.youtube.com/user/gorillaz',
        height: 270,
        thumbnail_height: 360,
        provider_name: 'YouTube',
        title: 'Gorillaz - Humility (Official Video)',
        provider_url: 'https://www.youtube.com/',
        author_name: 'Gorillaz',
        version: '1.0',
        thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
        type: 'video'
    }
};

export const WithCaption = Template.bind({});
WithCaption.args = {
    display: 'Selected',
    url: 'https://ghost.org/',
    caption: 'This is a caption',
    embedType: 'video',
    html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
    metadata: {
        html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/E5yFcdPAGv0?feature=oembed" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>',
        thumbnail_width: 480,
        width: 480,
        author_url: 'https://www.youtube.com/user/gorillaz',
        height: 270,
        thumbnail_height: 360,
        provider_name: 'YouTube',
        title: 'Gorillaz - Humility (Official Video)',
        provider_url: 'https://www.youtube.com/',
        author_name: 'Gorillaz',
        version: '1.0',
        thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
        type: 'video'
    }
};
