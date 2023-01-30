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
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <BookmarkCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
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
    display: 'Selected',
    urlValue: 'https://ghost.org/',
    urlPlaceholder: 'Paste URL to add bookmark content...',
    bookmarkTitle: 'Ghost: The Creator Economy Platform',
    bookmarkDesc: 'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
    bookmarkIcon: true,
    bookmarkPublisher: 'Ghost - The Professional Publishing Platform',
    bookmarkThumbnail: true,
    caption: ''
};

