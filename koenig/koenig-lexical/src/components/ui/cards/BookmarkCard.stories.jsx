import React from 'react';
import {BookmarkCard} from './BookmarkCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Bookmark card',
    component: BookmarkCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <BookmarkCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    urlValue: '',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    bookmarkTitle: 'Ghost: The Creator Economy Platform',
    bookmarkDesc: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    bookmarkIcon: true,
    bookmarkPublisher: 'Ghost - The Professional Publishing Platform',
    bookmarkThumbnail: true
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    urlValue: 'https://ghost.org/',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    bookmarkTitle: 'Ghost: The Creator Economy Platform',
    bookmarkDesc: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    bookmarkIcon: true,
    bookmarkPublisher: 'Ghost - The Professional Publishing Platform',
    bookmarkThumbnail: true,
    caption: ''
};

