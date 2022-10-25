import React from 'react';
import {FileCard} from './FileCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Cards/File Card',
    component: FileCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <FileCard {...args} />
        </CardWrapper>
    </div>
);

export const Placeholder = Template.bind({});
Placeholder.args = {
    isSelected: true
};

