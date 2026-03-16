import {MediaPlaceholder} from './MediaPlaceholder';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof MediaPlaceholder> = {
    title: 'Generic/Media placeholder (beta)',
    component: MediaPlaceholder,
    argTypes: {
        icon: {
            options: ['image', 'gallery', 'video', 'audio', 'file', 'product'],
            control: {type: 'select'}
        },
        size: {
            options: ['xsmall', 'small', 'medium', 'large'],
            control: {type: 'select'}
        },
        borderStyle: {
            options: ['squared', 'rounded'],
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

const Template: StoryFn<typeof MediaPlaceholder> = args => (
    <div className="flex">
        <MediaPlaceholder {...args} />
    </div>
);

export const Image: StoryFn<typeof MediaPlaceholder> = Template.bind({});
Image.args = {
    icon: 'image',
    desc: 'Click to select an image',
    size: 'medium',
    borderStyle: 'squared'
};

export const Gallery: StoryFn<typeof MediaPlaceholder> = Template.bind({});
Gallery.args = {
    icon: 'gallery',
    desc: 'Click to select up to 9 images',
    size: 'large',
    borderStyle: 'squared'
};

export const Video: StoryFn<typeof MediaPlaceholder> = Template.bind({});
Video.args = {
    icon: 'video',
    desc: 'Click to select a video',
    size: 'medium',
    borderStyle: 'squared'
};

export const Audio: StoryFn<typeof MediaPlaceholder> = Template.bind({});
Audio.args = {
    icon: 'audio',
    desc: 'Click to upload an audio file',
    size: 'xsmall',
    borderStyle: 'squared'
};

export const File: StoryFn<typeof MediaPlaceholder> = Template.bind({});
File.args = {
    icon: 'file',
    desc: 'Click to upload a file',
    size: 'xsmall',
    borderStyle: 'squared'
};

export const Product: StoryFn<typeof MediaPlaceholder> = Template.bind({});
Product.args = {
    icon: 'product',
    desc: 'Click to upload a product image',
    size: 'small',
    borderStyle: 'squared'
};

export const ErrorState: StoryFn<typeof MediaPlaceholder> = Template.bind({});
ErrorState.args = {
    icon: 'video',
    desc: 'Click to select a video',
    size: 'medium',
    borderStyle: 'squared',
    errors: [{message: 'The file type you uploaded is not supported. Please use .MP4, .WEBM, .OGV'}]
};
