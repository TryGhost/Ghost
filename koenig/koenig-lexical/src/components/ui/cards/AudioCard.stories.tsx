import {AudioCard} from './AudioCard';
import {CardWrapper} from './../CardWrapper';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof AudioCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Audio card',
    component: AudioCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
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

const Template: StoryFn<StoryArgs> = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...displayOptions[display]} {...args}>
                <AudioCard {...displayOptions[display]} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {},
    thumbnailUploader: {}
};

export const Uploading: StoryFn<StoryArgs> = Template.bind({});
Uploading.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {progress: 50, isLoading: true},
    thumbnailUploader: {}
};

export const DraggedOver: StoryFn<StoryArgs> = Template.bind({});
DraggedOver.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {},
    thumbnailUploader: {},
    audioDragHandler: {
        isDraggedOver: true
    }
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    thumbnailSrc: '',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    audioUploader: {},
    thumbnailUploader: {}
};

export const Error: StoryFn<StoryArgs> = Template.bind({});
Error.args = {
    display: 'Editing',
    src: '',
    title: '',
    audioUploader: {errors: [{message: 'The file type you uploaded is not supported. Please use .MP3, .WAV, .OGG, .M4A'}]},
    thumbnailUploader: {}
};

export const ThumbnailUploading: StoryFn<StoryArgs> = Template.bind({});
ThumbnailUploading.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    thumbnailUploader: {progress: 50, isLoading: true}
};

export const ThumbnailDraggedOver: StoryFn<StoryArgs> = Template.bind({});
ThumbnailDraggedOver.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    audioUploader: {},
    thumbnailUploader: {},
    thumbnailDragHandler: {
        isDraggedOver: true
    }
};

export const ThumbnailPopulated: StoryFn<StoryArgs> = Template.bind({});
ThumbnailPopulated.args = {
    display: 'Editing',
    thumbnailSrc: 'https://static.ghost.org/Orb4b.gif',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    audioUploader: {},
    thumbnailUploader: {}
};

export const ThumbnailError: StoryFn<StoryArgs> = Template.bind({});
ThumbnailError.args = {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Ghost Podcast',
    thumbnailUploader: {
        progress: 100,
        isLoading: false,
        errors: [{message: 'File not supported'}]
    }
};
