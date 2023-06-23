import type {Meta, StoryObj} from '@storybook/react';

import ImageUpload from './ImageUpload';

const meta = {
    title: 'Global / Form / Image upload',
    component: ImageUpload,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{maxWidth: '600px'}}>{_story()}</div>)]
} satisfies Meta<typeof ImageUpload>;

export default meta;
type Story = StoryObj<typeof ImageUpload>;

export const Default: Story = {
    args: {
        id: 'image-upload-test',
        children: 'Upload image',
        onUpload: (file: File) => {
            alert(`You're uploading: ${file.name}`);
        }
    }
};

export const Resized: Story = {
    args: {
        id: 'image-upload-test',
        children: 'Upload image',
        width: '480px',
        height: '320px',
        onUpload: (file: File) => {
            alert(`You're uploading: ${file.name}`);
        }
    }
};

export const ImageUploaded: Story = {
    args: {
        id: 'image-upload-test',
        children: 'Upload image',
        width: '480px',
        height: '320px',
        imageURL: 'https://images.unsplash.com/photo-1685374156924-5230519f4ab3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8YWxsfDI1fHx8fHx8Mnx8MTY4NTYzNzE3M3w&ixlib=rb-4.0.3&q=80&w=2000',
        onUpload: (file: File) => {
            alert(`You're uploading: ${file.name}`);
        },
        onDelete: () => {
            alert('Delete image');
        }
    }
};