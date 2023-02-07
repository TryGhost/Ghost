import React from 'react';
import {VideoCard} from './VideoCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Video card',
    component: VideoCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        },
        cardWidth: {
            options: ['regular', 'wide', 'full'],
            control: {type: 'radio'}
        }
    },
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <VideoCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    cardWidth: 'regular',
    thumbnail: '',
    customThumbnail: '',
    caption: ''
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    cardWidth: 'regular',
    thumbnail: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    customThumbnail: '',
    totalDuration: '2:27',
    caption: 'Introducing the newest accessory for your Mac.'
};

export const ProgressVideo = Template.bind({});
ProgressVideo.args = {
    display: 'Editing',
    cardWidth: 'regular',
    thumbnail: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    customThumbnail: '',
    totalDuration: '2:27',
    caption: 'Introducing the newest accessory for your Mac.',
    isVideoLoading: true,
    videoUploadProgress: 60
};

export const ProgressCustomThumbnail = Template.bind({});
ProgressCustomThumbnail.args = {
    display: 'Editing',
    cardWidth: 'regular',
    thumbnail: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    customThumbnail: '',
    totalDuration: '2:27',
    caption: 'Introducing the newest accessory for your Mac.',
    isCustomThumbnailLoading: true,
    customThumbnailUploadProgress: 60
};

export const EnabledLoop = Template.bind({});
EnabledLoop.args = {
    display: 'Editing',
    cardWidth: 'regular',
    thumbnail: 'https://static.ghost.org/v5.0.0/images/publication-cover.jpg',
    customThumbnail: '',
    totalDuration: '2:27',
    caption: 'Introducing the newest accessory for your Mac.',
    isLoopChecked: true
};

