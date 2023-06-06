import type {Meta, StoryObj} from '@storybook/react';

import Heading from './Heading';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from './PreviewModal';
import PreviewModalContainer from './PreviewModalContainer';

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
        )
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

export const CustomHeader: Story = {
    args: {
        ...Default.args,
        customHeader: (
            <div className='border-b border-grey-100 bg-black p-10 text-center text-white'>
                <Heading level={3}>A custom header here</Heading>
            </div>
        )
    }
};
