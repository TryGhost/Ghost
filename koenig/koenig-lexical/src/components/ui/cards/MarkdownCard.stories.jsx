import React from 'react';
import {MarkdownCard} from './MarkdownCard.jsx';
import {CardWrapper} from './../CardWrapper';
import {ReactComponent as MarkdownIndicatorIcon} from '../../../assets/icons/kg-indicator-markdown.svg';
import {useFileUpload} from '../../../../demo/utils/useFileUpload';
import {defaultHeaders} from '../../../../demo/utils/unsplashConfig';

const unsplashConfig = {
    defaultHeaders
};

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
                }
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
            <CardWrapper wrapperStyle='wide' IndicatorIcon={MarkdownIndicatorIcon} {...display} {...args}>
                <MarkdownCard {...display} {...args} unsplashConf={unsplashConfig} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    markdown: '',
    display: 'Editing',
    imageUploader: useFileUpload
};

export const Populated = Template.bind({});
Populated.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: useFileUpload
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
