import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';
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

const defaultProps = {
    featureImageURL: 'https://loremflickr.com/i/width-800/height-600',
    faviconURL: 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64',
    postTitle: 'Post title',
    postExcerpt: 'Post excerpt',
    siteTitle: 'Site title',
    author: 'Bjorn',
    onClose: () => {
        alert('Close');
    }
};

export const Default: Story = {
    args: {
        children: <Button>Share Post</Button>,
        ...defaultProps
    }
};

export const WithCustomTrigger: Story = {
    args: {
        children: (
            <Button size="sm" variant="outline">
                Open Share Modal
            </Button>
        ),
        ...defaultProps
    }
};

export const OpenByDefault: Story = {
    args: {
        defaultOpen: true,
        children: <Button>Share Post (Open)</Button>,
        ...defaultProps
    }
};

export const WithWorkingCloseButton: Story = {
    render: () => {
        const InteractiveExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <PostShareModal
                    author="John Doe"
                    faviconURL="https://www.google.com/s2/favicons?domain=ghost.org&sz=64"
                    featureImageURL="https://loremflickr.com/800/600"
                    open={isOpen}
                    postExcerpt="Learn the best practices for creating reusable and maintainable React components that scale with your application."
                    postTitle="How to Build Amazing React Components"
                    siteTitle="Ghost Blog"
                    onClose={() => setIsOpen(false)}
                    onOpenChange={setIsOpen}
                >
                    <Button onClick={() => setIsOpen(true)}>
                        Open Modal (Working Close)
                    </Button>
                </PostShareModal>
            );
        };

        return <InteractiveExample />;
    }
};
