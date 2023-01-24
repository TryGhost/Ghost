import React from 'react';
import {VideoCard} from './VideoCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Video card',
    component: VideoCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'},
        cardWidth: {
            options: ['regular', 'wide', 'full'],
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...args}>
                <VideoCard {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    cardWidth: 'regular',
    thumbnail: '',
    customThumbnail: '',
    caption: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    cardWidth: 'regular',
    thumbnail: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    customThumbnail: '',
    totalDuration: '2:27',
    caption: 'Introducing the newest accessory for your Mac.'
};

