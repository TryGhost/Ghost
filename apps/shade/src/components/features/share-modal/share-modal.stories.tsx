import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import ShareModal, {type ShareModalSocialLink} from './share-modal';

const meta = {
    title: 'Features / Share Modal',
    component: ShareModal,
    tags: ['autodocs'],
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof ShareModal>;

export default meta;

type Story = StoryObj<typeof meta>;

const postUrl = 'https://example.com/copy-clipboard-react-guide';
const encodedPostTitle = encodeURIComponent('Copy to Clipboard in React: Complete Guide');
const encodedPostUrl = encodeURIComponent(postUrl);
const encodedPostTitleAndUrl = encodeURIComponent(`Copy to Clipboard in React: Complete Guide ${postUrl}`);

const publicationUrl = 'https://ghost.org';
const encodedPublicationUrl = encodeURIComponent(publicationUrl);

const postSocialLinks: ShareModalSocialLink[] = [
    {
        href: `https://twitter.com/intent/tweet?text=${encodedPostTitle}%0A${encodedPostUrl}`,
        label: 'Share on X',
        service: 'x'
    },
    {
        href: `https://threads.net/intent/post?text=${encodedPostTitleAndUrl}`,
        label: 'Share on Threads',
        service: 'threads'
    },
    {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedPostUrl}`,
        label: 'Share on Facebook',
        service: 'facebook'
    },
    {
        href: `https://www.linkedin.com/shareArticle?mini=true&title=${encodedPostTitle}&url=${encodedPostUrl}`,
        label: 'Share on LinkedIn',
        service: 'linkedin'
    }
];

const publicationSocialLinks: ShareModalSocialLink[] = [
    {
        href: `https://twitter.com/intent/tweet?url=${encodedPublicationUrl}`,
        label: 'Share your publication on X',
        service: 'x'
    },
    {
        href: `https://threads.net/intent/post?text=${encodedPublicationUrl}`,
        label: 'Share your publication on Threads',
        service: 'threads'
    },
    {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedPublicationUrl}`,
        label: 'Share your publication on Facebook',
        service: 'facebook'
    },
    {
        href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodedPublicationUrl}`,
        label: 'Share your publication on LinkedIn',
        service: 'linkedin'
    }
];

const postArgs = {
    copyURL: postUrl,
    description: <>
        Your post was published on your site and sent to <strong>3 subscribers</strong> of <strong>Ghost Blog</strong>, on <strong>June 13th</strong> at <strong>12:02</strong>.
    </>,
    preview: {
        description: 'A comprehensive guide to implementing copy-to-clipboard functionality in React applications with proper error handling and user feedback.',
        imageURL: 'https://picsum.photos/800/600?random=1',
        meta: (
            <div className="mt-2 flex items-start gap-2">
                <div className="mt-0.5 size-4 bg-cover bg-center" style={{backgroundImage: 'url(https://www.google.com/s2/favicons?domain=ghost.org&sz=64)'}}></div>
                <div className="flex gap-1">
                    <strong>Ghost Blog</strong>
                    <span>&bull;</span>
                    <span>Jane Smith</span>
                </div>
            </div>
        ),
        title: 'Copy to Clipboard in React: Complete Guide',
        url: postUrl
    },
    primaryTitle: 'Your post is published.',
    secondaryTitle: 'Spread the word!',
    socialLinks: postSocialLinks,
    variant: 'post' as const
};

const publicationArgs = {
    actionsLayout: 'footer' as const,
    copyURL: publicationUrl,
    guidance: (
        <p className="text-sm text-muted-foreground">
            Set your publication&apos;s cover image and description in <Button className="h-auto p-0 align-baseline text-sm text-green hover:text-green/90" variant="link" asChild><a href="#/settings/design/edit?ref=setup">Design settings</a></Button>.
        </p>
    ),
    preview: {
        description: 'Thoughts, stories and ideas.',
        imageURL: 'https://picsum.photos/800/600?random=2',
        title: 'Ghostbusters',
        url: publicationUrl
    },
    socialLinks: publicationSocialLinks,
    title: 'Share your publication',
    variant: 'publication' as const
};

const postSource = `const [isOpen, setIsOpen] = useState(false);

const postUrl = 'https://example.com/copy-clipboard-react-guide';
const encodedPostTitle = encodeURIComponent('Copy to Clipboard in React: Complete Guide');
const encodedPostUrl = encodeURIComponent(postUrl);

<ShareModal
    copyURL={postUrl}
    description={<>Your post was published on your site and sent to <strong>3 subscribers</strong>.</>}
    open={isOpen}
    preview={{
        description: 'A comprehensive guide to implementing copy-to-clipboard functionality in React applications.',
        imageURL: 'https://picsum.photos/800/600?random=1',
        meta: (
            <div className="mt-2 flex items-start gap-2">
                <div className="mt-0.5 size-4 bg-cover bg-center" style={{backgroundImage: 'url(https://www.google.com/s2/favicons?domain=ghost.org&sz=64)'}} />
                <div className="flex gap-1">
                    <strong>Ghost Blog</strong>
                    <span>&bull;</span>
                    <span>Jane Smith</span>
                </div>
            </div>
        ),
        title: 'Copy to Clipboard in React: Complete Guide',
        url: postUrl
    }}
    primaryTitle="Your post is published."
    secondaryTitle="Spread the word!"
    socialLinks={[
        {
            href: \`https://twitter.com/intent/tweet?text=\${encodedPostTitle}%0A\${encodedPostUrl}\`,
            label: 'Share on X',
            service: 'x'
        }
    ]}
    variant="post"
    onClose={() => setIsOpen(false)}
    onOpenChange={setIsOpen}
>
    <Button onClick={() => setIsOpen(true)}>Share post</Button>
</ShareModal>`;

const publicationSource = `const [isOpen, setIsOpen] = useState(false);

const publicationUrl = 'https://ghost.org';
const encodedPublicationUrl = encodeURIComponent(publicationUrl);

<ShareModal
    actionsLayout="footer"
    copyURL={publicationUrl}
    guidance={(
        <p className="text-sm text-muted-foreground">
            Set your publication's cover image and description in{' '}
            <Button className="h-auto p-0 align-baseline text-sm text-green hover:text-green/90" variant="link" asChild>
                <a href="#/settings/design/edit?ref=setup">Design settings</a>
            </Button>.
        </p>
    )}
    open={isOpen}
    preview={{
        description: 'Thoughts, stories and ideas.',
        imageURL: 'https://picsum.photos/800/600?random=2',
        title: 'Ghostbusters',
        url: publicationUrl
    }}
    socialLinks={[
        {
            href: \`https://threads.net/intent/post?text=\${encodedPublicationUrl}\`,
            label: 'Share your publication on Threads',
            service: 'threads'
        }
    ]}
    title="Share your publication"
    variant="publication"
    onClose={() => setIsOpen(false)}
    onOpenChange={setIsOpen}
>
    <Button onClick={() => setIsOpen(true)}>Share publication</Button>
</ShareModal>`;

export const Post: Story = {
    args: {
        ...postArgs
    },
    render: (args) => {
        const PostExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal
                    {...args}
                    open={isOpen}
                    onClose={() => setIsOpen(false)}
                    onOpenChange={setIsOpen}
                >
                    <Button onClick={() => setIsOpen(true)}>Share post</Button>
                </ShareModal>
            );
        };

        return <PostExample />;
    },
    parameters: {
        docs: {
            source: {
                code: postSource
            }
        }
    }
};

export const Publication: Story = {
    args: {
        ...publicationArgs
    },
    render: (args) => {
        const PublicationExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal
                    {...args}
                    open={isOpen}
                    onClose={() => setIsOpen(false)}
                    onOpenChange={setIsOpen}
                >
                    <Button onClick={() => setIsOpen(true)}>Share publication</Button>
                </ShareModal>
            );
        };

        return <PublicationExample />;
    },
    parameters: {
        docs: {
            source: {
                code: publicationSource
            }
        }
    }
};

export const ControlledPublication: Story = {
    args: {
        copyURL: publicationUrl,
        preview: {
            title: 'Ghostbusters',
            url: publicationUrl
        }
    },
    parameters: {
        docs: {
            source: {
                code: publicationSource.replace('Share publication', 'Open publication share modal')
            }
        }
    },
    render: () => {
        const ControlledExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal
                    {...publicationArgs}
                    open={isOpen}
                    onClose={() => setIsOpen(false)}
                    onOpenChange={setIsOpen}
                >
                    <Button onClick={() => setIsOpen(true)}>
                        Open publication share modal
                    </Button>
                </ShareModal>
            );
        };

        return <ControlledExample />;
    }
};
