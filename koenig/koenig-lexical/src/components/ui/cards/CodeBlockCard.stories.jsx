import React from 'react';
import {CodeBlockCard} from './CodeBlockCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Code card',
    component: CodeBlockCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <CodeBlockCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    code: ''
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    code: '<script></script>'
};
