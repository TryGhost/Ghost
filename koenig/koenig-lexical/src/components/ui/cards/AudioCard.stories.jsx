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
    title: '',
    audioTitlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {}
};

export const Error = Template.bind({});
Error.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {errors: [{filename: 'audio.mp3', message: 'Audio file is too large'}]},
    thumbnailUploader: {}
};

export const EmptyDraggedOver = Template.bind({});
EmptyDraggedOver.args = {
    display: 'Editing',
    src: '',
    title: '',
    isDraggedOver: true,
    audioUploader: {},
    thumbnailUploader: {}
};

export const PopulatedDraggedOver = Template.bind({});
PopulatedDraggedOver.args = {
    display: 'Editing',
    src: 'audio.mp3',
    title: '',
    isDraggedOver: true,
    audioUploader: {},
    thumbnailUploader: {}
};

export const PopulatedWithoutThumbnail = Template.bind({});
PopulatedWithoutThumbnail.args = {
    display: 'Editing',
    thumbnailSrc: '',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {}
};

export const PopulatedWithThumbnail = Template.bind({});
PopulatedWithThumbnail.args = {
    display: 'Editing',
    thumbnailSrc: 'https://via.placeholder.com/80x80',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {}
};

export const UploadingAudio = Template.bind({});
UploadingAudio.args = {
    display: 'Editing',
    src: '',
    title: '',
    titlePlaceholder: 'Add a title...',
    audioUploader: {progress: 50, isLoading: true}
};

export const UploadingThumbnail = Template.bind({});
UploadingThumbnail.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: {progress: 50, isLoading: true}
};

export const UploadingThumbnailErrors = Template.bind({});
UploadingThumbnailErrors.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'Audio file title',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: {
        progress: 100,
        isLoading: false,
        errors: [{filename: 'audio.mp3', message: 'Thumbnail file is too large'}]
    }
};
