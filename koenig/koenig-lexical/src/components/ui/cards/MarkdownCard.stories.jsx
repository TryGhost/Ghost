import React from 'react';
import {MarkdownCard} from './MarkdownCard.jsx';
import {CardWrapper} from './../CardWrapper';
import {useImageUpload} from '../../../../demo/utils/useImageUpload';
import {defaultHeaders} from '../../../../demo/utils/unsplashConfig';

function imageLoading() {
    return {progress: 60, isLoading: true, filesNumber: 2};
}

function imageErrors() {
    const errors = [
        {
            fileName: 'Image.jpg',
            message: 'The file type you uploaded is not supported.'
        }
    ];
    return {errors};
}

const story = {
    title: 'Primary cards/Markdown card',
    component: MarkdownCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'functional'

        }
    }
};
export default story;

const Template = args => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper wrapperStyle='wide' {...args}>
                <MarkdownCard {...args} unsplashConf={defaultHeaders} />
            </CardWrapper>
        </div>
    </div>
);

export const Populated = Template.bind({});
Populated.args = {
    markdown: '**Bold** and *italic*',
    isSelected: true,
    isEditing: true,
    imageUploader: useImageUpload
};

export const Progress = Template.bind({});
Progress.args = {
    markdown: '**Bold** and *italic*',
    isSelected: true,
    isEditing: true,
    imageUploader: imageLoading
};

export const Errors = Template.bind({});
Errors.args = {
    markdown: '**Bold** and *italic*',
    isSelected: true,
    isEditing: true,
    imageUploader: imageErrors
};
