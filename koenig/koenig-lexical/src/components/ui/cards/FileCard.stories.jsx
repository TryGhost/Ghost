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

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    isPopulated: false
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    isPopulated: true,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB'
};

