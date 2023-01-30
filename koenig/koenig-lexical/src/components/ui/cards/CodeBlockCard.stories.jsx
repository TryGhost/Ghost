import React from 'react';
import {CodeBlockCard} from './CodeBlockCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Code card',
    component: CodeBlockCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isEditing: {control: 'boolean'},
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper wrapperStyle='code-card' {...args}>
                <CodeBlockCard updateCode={() => {}} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isEditing: true,
    isSelected: true,
    code: '',
    language: '',
    caption: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isEditing: true,
    isSelected: true,
    code: '<script></script>',
    language: 'html',
    caption: 'A code example'
};
