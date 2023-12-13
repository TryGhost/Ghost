import type {Meta, StoryObj} from '@storybook/react';

import FileUpload from './FileUpload';

const meta = {
    title: 'Global / Form / File Upload',
    component: FileUpload,
    tags: ['autodocs']
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
    args: {
        id: 'test-file',
        onUpload: (file: File) => {
            alert(`You're uploading: ${file.name}`);
        },
        children: 'Click here to upload'
    }
};

export const Custom: Story = {
    args: {
        id: 'test-file',
        onUpload: (file: File) => {
            alert(`You're uploading: ${file.name}`);
        },
        children: (
            <div className='max-w-xl cursor-pointer bg-grey-100 px-10 py-5 text-center'>
                Click here to upload
            </div>
        )
    }
};
