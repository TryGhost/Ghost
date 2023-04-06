import React from 'react';
import {BookmarkCard} from './BookmarkCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Bookmark card',
    component: BookmarkCard,
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

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] p-4">
            <CardWrapper {...display} {...args}>
                <BookmarkCard {...display} {...args} />
            </CardWrapper>
        </div>
        <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px] bg-black p-4">
            <CardWrapper {...display} {...args}>
                <BookmarkCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
    url: '',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    title: 'Ghost: The Creator Economy Platform',
    description: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    icon: 'https://www.ghost.org/favicon.ico',
    publisher: 'Ghost - The Professional Publishing Platform',
    author: 'Author McAuthory',
    thumbnail: 'https://ghost.org/images/meta/ghost.png'
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Selected',
    url: 'https://ghost.org/',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    title: 'Ghost: The Creator Economy Platform',
    description: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    icon: 'https://www.ghost.org/favicon.ico',
    publisher: 'Ghost - The Professional Publishing Platform',
    author: 'Author McAuthory',
    thumbnail: 'https://ghost.org/images/meta/ghost.png',
    caption: ''
};

export const WithCaption = Template.bind({});
WithCaption.args = {
    display: 'Selected',
    url: 'https://ghost.org/',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    title: 'Ghost: The Creator Economy Platform',
    description: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    icon: 'https://www.ghost.org/favicon.ico',
    publisher: 'Ghost - The Professional Publishing Platform',
    author: 'Author McAuthory',
    thumbnail: 'https://ghost.org/images/meta/ghost.png',
    caption: 'This is a caption'
};
