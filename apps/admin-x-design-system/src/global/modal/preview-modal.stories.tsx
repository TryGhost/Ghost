import type {Meta, StoryContext, StoryObj} from '@storybook/react-vite';
import {ReactNode} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import Button from '../button';
import Heading from '../heading';
import PreviewModal, {PreviewModalProps} from './preview-modal';

const PreviewModalContainer: React.FC<PreviewModalProps> = ({...props}) => {
    return (
        <Button color='black' label='Open preview modal' onClick={() => {
            NiceModal.show(PreviewModal, {...props});
        }} />
    );
};

const meta = {
    title: 'Global / Modal / Preview Modal',
    component: PreviewModal,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode, context: StoryContext) => (
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
        previewToolbarTabs: <span className='text-sm text-grey-500'>Preview tabs slot</span>,
        deviceSelector: <span className='text-sm text-grey-500'>Device selector slot</span>
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

export const BreadcrumbsToolbar: Story = {
    args: {
        ...Default.args,
        previewToolbarTabs: undefined,
        previewToolbarBreadcrumbs: (
            <span className='text-sm text-grey-500'>Toolbar breadcrumbs slot</span>
        )
    }
};
