import {CardWrapper} from './../CardWrapper';
import {FileCard} from './FileCard';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof FileCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/File card',
    component: FileCard,
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

const Template: StoryFn<StoryArgs> = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...displayOptions[display]} {...args}>
                <FileCard {...displayOptions[display]} {...args} />
            </CardWrapper>
        </div>
        <div className="dark bg-black py-10">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper {...displayOptions[display]} {...args}>
                    <FileCard {...displayOptions[display]} {...args} />
                </CardWrapper>
            </div>
        </div>
    </div>
);

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Editing',
    isPopulated: false,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB',
    fileInputRef: {current: null},
    fileDragHandler: {}
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    display: 'Editing',
    isPopulated: true,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB',
    fileInputRef: {current: null},
    fileDragHandler: {}
};

