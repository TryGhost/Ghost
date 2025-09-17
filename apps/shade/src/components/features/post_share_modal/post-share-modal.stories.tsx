import type {Meta, StoryObj} from '@storybook/react-vite';
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
    description: <>
        Your post was published on your site and sent to <strong>3 subscribers</strong> of <strong>Handcrafted questioner</strong>, on <strong>June 13th</strong> at <strong>12:02</strong>.
    </>,
    featureImageURL: 'https://loremflickr.com/800/600',
    faviconURL: 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64',
    postURL: 'https://ghost.org/sample-post-url',
    postTitle: 'How to Build Amazing React Components',
    postExcerpt: 'Learn the best practices for creating reusable and maintainable React components that scale with your application.',
    siteTitle: 'Ghost Blog',
    author: 'John Doe',
    onClose: () => {
        alert('Modal closed');
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

export const NoFeatureImage: Story = {
    args: {
        children: (
            <Button size="sm" variant="outline">
                Open Share Modal
            </Button>
        ),
        ...defaultProps,
        featureImageURL: ''
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
                    postURL="https://myblog.com/amazing-react-components"
                    siteTitle="Ghost Blog"
                    onClose={() => setIsOpen(false)}
                    onOpenChange={setIsOpen}
                >
                    <Button onClick={() => setIsOpen(true)}>
                        Open Modal (Working Close & Copy)
                    </Button>
                </PostShareModal>
            );
        };

        return <InteractiveExample />;
    }
};

export const CopyLinkDemo: Story = {
    render: () => {
        const CopyExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <div className="space-y-4">
                    <PostShareModal
                        author="Jane Smith"
                        defaultOpen={isOpen}
                        faviconURL="https://www.google.com/s2/favicons?domain=example.com&sz=64"
                        featureImageURL="https://picsum.photos/800/600?random=1"
                        open={isOpen}
                        postExcerpt="A comprehensive guide to implementing copy-to-clipboard functionality in React applications with proper error handling and user feedback."
                        postTitle="Copy to Clipboard in React: Complete Guide"
                        postURL="https://example.com/copy-clipboard-react-guide"
                        siteTitle="Tech Blog"
                        onClose={() => setIsOpen(false)}
                        onOpenChange={setIsOpen}
                    >
                        <Button onClick={() => setIsOpen(true)}>
                            Demo Copy Link Feature
                        </Button>
                    </PostShareModal>
                </div>
            );
        };

        return <CopyExample />;
    }
};

export const PostSuccess: Story = {
    render: () => {
        const CopyExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <div className="space-y-4">
                    <PostShareModal
                        author="Jane Smith"
                        defaultOpen={isOpen}
                        description={<>
                            Your post was published on your site of <strong>The Utegaard</strong>, today at 12:40
                        </>}
                        faviconURL="https://www.google.com/s2/favicons?domain=example.com&sz=64"
                        featureImageURL="https://picsum.photos/800/600?random=1"
                        open={isOpen}
                        postExcerpt="A comprehensive guide to implementing copy-to-clipboard functionality in React applications with proper error handling and user feedback."
                        postTitle="Copy to Clipboard in React: Complete Guide"
                        postURL="https://example.com/copy-clipboard-react-guide"
                        primaryTitle="Boom it's out there"
                        secondaryTitle="That's 519 post published"
                        siteTitle="Tech Blog"
                        onClose={() => setIsOpen(false)}
                        onOpenChange={setIsOpen}
                    >
                        <Button onClick={() => setIsOpen(true)}>
                            Post success dialog
                        </Button>
                    </PostShareModal>
                </div>
            );
        };

        return <CopyExample />;
    }
};
