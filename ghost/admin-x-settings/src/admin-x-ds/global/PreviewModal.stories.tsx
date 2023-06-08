import type {Meta, StoryObj} from '@storybook/react';

import Heading from './Heading';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from './PreviewModal';
import PreviewModalContainer from './PreviewModalContainer';
import {SelectOption} from './Select';

const meta = {
    title: 'Global / Modal / Preview Modal',
    component: PreviewModal,
    tags: ['autodocs'],
    decorators: [(_story: any, context: any) => (
        <NiceModal.Provider>
            <PreviewModalContainer {...context.args} />
        </NiceModal.Provider>
    )]
} satisfies Meta<typeof PreviewModal>;

export default meta;
type Story = StoryObj<typeof PreviewModal>;

const selectOptions: SelectOption[] = [
    {value: 'homepage', label: 'Homepage'},
    {value: 'post', label: 'Post'},
    {value: 'page', label: 'Page'},
    {value: 'tag-archive', label: 'Tag archive'},
    {value: 'author-archive', label: 'Author archive'}
];

export const Default: Story = {
    args: {
        title: 'Preview modal',
        preview: (
            <div className='flex h-full items-center justify-center text-sm text-grey-500'>
                Preview area
            </div>
        ),
        sidebar: (
            <div className='flex h-full items-center justify-center text-sm text-grey-500'>
                Sidebar area
            </div>
        ),
        previewToolbarURLs: selectOptions
    }
};

export const NoPreviewToolbar: Story = {
    args: {
        title: 'Preview modal',
        preview: (
            <div className='flex h-full items-center justify-center text-sm text-grey-500'>
                Preview area
            </div>
        ),
        sidebar: (
            <div className='flex h-full items-center justify-center text-sm text-grey-500'>
                Sidebar area
            </div>
        ),
        previewToolbar: false
    }
};

export const CustomButtons: Story = {
    args: {
        ...Default.args,
        cancelLabel: 'Meh',
        okLabel: 'Alrite',
        okColor: 'green'
    }
};

export const CustomSidebarHeader: Story = {
    args: {
        ...Default.args,
        sidebarHeader: (
            <div className='border-b border-grey-100 bg-black p-10 text-center text-white'>
                <Heading level={3}>A custom header here</Heading>
            </div>
        )
    }
};
