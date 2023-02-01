import React from 'react';
import {AudioCard} from './AudioCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Audio card',
    component: AudioCard,
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
                <AudioCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioTitlePlaceholder: 'Add a title...'
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    thumbnailSrc: '',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    audioTitlePlaceholder: 'Add a title...'
};

export const PopulatedWithThumbnail = Template.bind({});
PopulatedWithThumbnail.args = {
    display: 'Editing',
    thumbnailSrc: 'https://via.placeholder.com/80x80',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    audioTitlePlaceholder: 'Add a title...'
};

export const UploadingAudio = Template.bind({});
UploadingAudio.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioTitlePlaceholder: 'Add a title...',
    audioProgress: 50,
    isUploadingAudio: true
};

export const UploadingThumbnail = Template.bind({});
UploadingThumbnail.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    audioTitlePlaceholder: 'Add a title...',
    thumbnailProgress: 50,
    isUploadingThumbnail: true
};
