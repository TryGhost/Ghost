import React, {useState} from 'react';
import {MarkdownCard} from './MarkdownCard.jsx';
import {CardWrapper} from './../CardWrapper';
import {getImageUrl} from '../../../../demo/utils/imageUploader';
import {defaultHeaders} from '../../../../demo/utils/unsplashConfig';

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
                    imageUploader={getImageUrl}
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
    isEditing: true
};
