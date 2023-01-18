import React from 'react';
import {FileCard} from './FileCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/File card',
    component: FileCard,
    subcomponent: {CardWrapper},
    argTypes: {
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
    <div className="mx-auto my-8 w-[740px]">
        <CardWrapper {...args}>
            <FileCard {...args} />
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    isPopulated: false,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB'
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

