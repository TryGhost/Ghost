import MarkdownIndicatorIcon from '../../../assets/icons/kg-indicator-markdown.svg?react';
import {CardWrapper} from './../CardWrapper';
import {MarkdownCard} from './MarkdownCard';
import {defaultHeaders} from '../../../../demo/utils/unsplashConfig';
import {useFileUpload} from '../../../../demo/utils/useFileUpload';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

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

type StoryArgs = ComponentProps<typeof MarkdownCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Markdown card',
    component: MarkdownCard,
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

const Template: StoryFn<StoryArgs> = ({display, imageUploader, ...args}) => {
    const defaultImageUploader = useFileUpload();

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper IndicatorIcon={MarkdownIndicatorIcon} wrapperStyle='wide' {...displayOptions[display]} {...args}>
                    <MarkdownCard imageUploader={imageUploader ?? defaultImageUploader} {...displayOptions[display]} {...args} unsplashConf={unsplashConfig} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    markdown: '',
    display: 'Editing'
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing'
};

export const Progress: StoryFn<StoryArgs> = Template.bind({});
Progress.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: imageLoading
};

export const Errors: StoryFn<StoryArgs> = Template.bind({});
Errors.args = {
    markdown: '**Bold** and *italic*',
    display: 'Editing',
    imageUploader: imageErrors
};
