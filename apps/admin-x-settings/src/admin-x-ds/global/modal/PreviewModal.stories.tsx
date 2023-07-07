import type {Meta, StoryObj} from '@storybook/react';

import Heading from '../Heading';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from './PreviewModal';
import PreviewModalContainer from './PreviewModalContainer';
import {Tab} from '../TabView';

const meta = {
    title: 'Global / Modal / Preview Modal',
    component: PreviewModal,
    tags: ['autodocs'],
    decorators: [(_story: any, context: any) => (
        <NiceModal.Provider>
            <PreviewModalContainer {...context.args} />
        </NiceModal.Provider>
    )],
    argTypes: {
        sidebar: {control: 'text'},
        preview: {control: 'text'},
        sidebarButtons: {control: 'text'},
        sidebarHeader: {control: 'text'}
    }
} satisfies Meta<typeof PreviewModal>;

export default meta;
type Story = StoryObj<typeof PreviewModal>;

const previewURLs: Tab[] = [
    {id: 'homepage', title: 'Homepage'},
    {id: 'post', title: 'Post'},
    {id: 'page', title: 'Page'},
    {id: 'tag-archive', title: 'Tag archive'},
    {id: 'author-archive', title: 'Author archive'}
];

export const Default: Story = {
    args: {
        title: 'Preview modal',
        preview: (
            <div className='flex h-[150%] items-center justify-center text-sm text-grey-500'>
                Scrollable preview area
            </div>
        ),
        sidebar: (
            <div className='flex h-full items-center justify-center text-sm text-grey-500'>
                Scrollable sidebar area
            </div>
        ),
        previewToolbarTabs: previewURLs,
        onSelectURL: (id: string) => {
            alert(id);
        }
    }
};

export const NoPreviewToolbar: Story = {
    args: {
        ...Default.args,
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

export const FullBleed: Story = {
    args: {
        ...Default.args,
        size: 'bleed'
    }
};