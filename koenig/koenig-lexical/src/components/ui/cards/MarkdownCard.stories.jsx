import React, {useState} from 'react';
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
            fileName: 'image.jpg',
            message: 'Wrong extension'
        },
        {
            fileName: 'cat.png',
            message: 'Smth went wrong'
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

const Template = (args) => {
    const [value, setValue] = useState(args.value ?? '');
    const onChange = (...params) => {
        args.onChange(...params);
        setValue(...params);
    };

    return (
        <div className="w-[764px]">
            <CardWrapper {...args}>
                <MarkdownCard
                    {...args}
                    onChange={onChange}
                    value={value}
                    unsplashConf={defaultHeaders}
                />
            </CardWrapper>
        </div>
    );
};

export const Populated = Template.bind({});
Populated.args = {
    value: '# Title',
    isSelected: true,
    isEditing: true,
    imageUploader: useImageUpload
};

export const Progress = Template.bind({});
Progress.args = {
    value: '# Title',
    isSelected: true,
    isEditing: true,
    imageUploader: imageLoading
};

export const Errors = Template.bind({});
Errors.args = {
    value: '# Title',
    isSelected: true,
    isEditing: true,
    imageUploader: imageErrors
};
