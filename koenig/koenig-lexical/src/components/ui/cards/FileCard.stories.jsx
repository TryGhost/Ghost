import React from 'react';
import {CardWrapper} from './../CardWrapper';
import {FileCard} from './FileCard';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/File card',
    component: FileCard,
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
                },
                defaultValue: displayOptions.Default
            }
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <FileCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
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
    display: 'Editing',
    isPopulated: true,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB'
};

