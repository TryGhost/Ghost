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
            type: 'functional'
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
    duration: '',
    title: '',
    isDraggedOver: false,
    audioUploader: {},
    thumbnailUploader: {}
};

export const Uploading = Template.bind({});
Uploading.args = {
    display: 'Editing',
    src: '',
    duration: '',
    title: '',
    titlePlaceholder: 'Add a title...',
    audioUploader: {progress: 50, isLoading: true},
    thumbnailUploader: {}
};

export const DraggedOver = Template.bind({});
DraggedOver.args = {
    display: 'Editing',
    src: '',
    duration: '',
    title: '',
    isDraggedOver: true,
    audioUploader: {},
    thumbnailUploader: {}
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    thumbnailSrc: '',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {}
};

export const Error = Template.bind({});
Error.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {errors: [{filename: 'audio.mp3', message: 'The file type you uploaded is not supported. Please use .MP3, .WAV, .OGG, .M4A'}]},
    thumbnailUploader: {}
};

export const ThumbnailUploading = Template.bind({});
ThumbnailUploading.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: {progress: 50, isLoading: true}
};

export const ThumbnailDraggedOver = Template.bind({});
ThumbnailDraggedOver.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    titlePlaceholder: 'Add a title...',
    isDraggedOver: true,
    audioUploader: {},
    thumbnailUploader: {}
};

export const ThumbnailPopulated = Template.bind({});
ThumbnailPopulated.args = {
    display: 'Editing',
    thumbnailSrc: 'https://static.ghost.org/Orb4b.gif',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    titlePlaceholder: 'Add a title...',
    isDraggedOver: false,
    audioUploader: {},
    thumbnailUploader: {}
};

export const ThumbnailError = Template.bind({});
ThumbnailError.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: {
        progress: 100,
        isLoading: false,
        errors: [{filename: 'audio.mp3', message: 'File not supported'}]
    }
};
