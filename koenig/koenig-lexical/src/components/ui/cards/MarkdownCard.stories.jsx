import React from 'react';
import {MarkdownCard} from './MarkdownCard.jsx';
import {CardWrapper} from './../CardWrapper';
import {useImageUpload} from '../../../../demo/utils/useImageUpload';
import {defaultHeaders} from '../../../../demo/utils/unsplashConfig';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

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
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper wrapperStyle='wide' {...display} {...args}>
                <MarkdownCard {...display} {...args} unsplashConf={defaultHeaders} />
            </CardWrapper>
        </div>
    </div>
);

export const Populated = Template.bind({});
Populated.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: useImageUpload
};

export const Progress = Template.bind({});
Progress.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: imageLoading
};

export const Errors = Template.bind({});
Errors.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: imageErrors
};
