import type {Meta, StoryObj} from '@storybook/react';
import {Button} from '@/components/ui/button';
import PostShareModal from './post-share-modal';

const meta = {
    title: 'Features / Post Share Modal',
    component: PostShareModal,
    tags: ['autodocs'],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof PostShareModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: <Button>Share Post</Button>
    }
};

export const WithCustomTrigger: Story = {
    args: {
        children: (
            <Button size="sm" variant="outline">
                Open Share Modal
            </Button>
        )
    }
};

export const OpenByDefault: Story = {
    args: {
        defaultOpen: true,
        children: <Button>Share Post (Open)</Button>
    }
};
