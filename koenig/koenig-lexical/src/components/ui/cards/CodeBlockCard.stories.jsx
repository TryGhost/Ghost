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
            type: 'inProgress'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <CodeBlockCard updateCode={() => {}} {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isEditing: true,
    isSelected: true,
    code: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isEditing: true,
    isSelected: true,
    code: '<script></script>'
};
