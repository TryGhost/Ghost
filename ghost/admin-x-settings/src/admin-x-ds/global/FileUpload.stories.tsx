import type {Meta, StoryObj} from '@storybook/react';

import FileUpload from './FileUpload';

const meta = {
    title: 'Global / Basic File Upload',
    component: FileUpload,
    tags: ['autodocs']
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
    args: {}
};
