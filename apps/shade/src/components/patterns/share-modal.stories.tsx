import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {H3} from '@/components/layout/heading';
import {Button} from '@/components/ui/button';
import ShareModal, {type ShareModalSocialLink} from './share-modal';

const meta = {
    title: 'Patterns / Share Modal',
    component: ShareModal.Root,
    tags: ['autodocs']
} satisfies Meta<typeof ShareModal.Root>;

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

const postPreview = {
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
};

const publicationPreview = {
    description: 'Thoughts, stories and ideas.',
    imageURL: 'https://picsum.photos/800/600?random=2',
    title: 'Ghost Journal',
    url: publicationUrl
};

function PostPreview() {
    return (
        <ShareModal.Preview className="rounded-md" href={postPreview.url}>
            <div className="aspect-video bg-cover bg-center" style={{backgroundImage: `url(${postPreview.imageURL})`}}></div>
            <div className="p-6 pt-5">
                <H3>{postPreview.title}</H3>
                <p>{postPreview.description}</p>
                {postPreview.meta}
            </div>
        </ShareModal.Preview>
    );
}

function PublicationPreview() {
    return (
        <ShareModal.Preview className="rounded-lg bg-card" href={publicationPreview.url}>
            <div className="aspect-video bg-cover bg-center" style={{backgroundImage: `url(${publicationPreview.imageURL})`}}></div>
            <div className="p-5">
                <div className="text-lg font-semibold">{publicationPreview.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{publicationPreview.description}</p>
            </div>
        </ShareModal.Preview>
    );
}

const postSource = `const [isOpen, setIsOpen] = useState(false);

<ShareModal.Root open={isOpen} onOpenChange={setIsOpen}>
    <ShareModal.Trigger>
        <Button onClick={() => setIsOpen(true)}>Share post</Button>
    </ShareModal.Trigger>
    <ShareModal.Content>
        <div className="sticky top-0 ml-auto size-0">
            <ShareModal.CloseButton className="absolute -top-5 -right-5" onClick={() => setIsOpen(false)} />
        </div>
        <ShareModal.Header className="relative -mt-5">
            <ShareModal.Title className="text-3xl leading-[1.15em] font-bold">
                <span className="text-state-success">Your post is published.</span><br />
                <span>Spread the word!</span>
            </ShareModal.Title>
            <ShareModal.Description className="mb-0 pt-1 pb-0 text-lg text-foreground">
                Your post was published on your site and sent to <strong>3 subscribers</strong>.
            </ShareModal.Description>
        </ShareModal.Header>
        <ShareModal.Preview className="rounded-md" href={postUrl}>
            <div className="aspect-video bg-cover bg-center" style={{backgroundImage: \`url(\${imageURL})\`}} />
            <div className="p-6 pt-5">
                <H3>Copy to Clipboard in React: Complete Guide</H3>
                <p>A comprehensive guide to implementing copy-to-clipboard functionality in React applications.</p>
            </div>
        </ShareModal.Preview>
        <ShareModal.Footer>
            <ShareModal.SocialLinks links={socialLinks} />
            <ShareModal.CopyButton className="ml-0! grow cursor-pointer" copyURL={postUrl} />
        </ShareModal.Footer>
    </ShareModal.Content>
</ShareModal.Root>`;

const publicationSource = `const [isOpen, setIsOpen] = useState(false);

<ShareModal.Root open={isOpen} onOpenChange={setIsOpen}>
    <ShareModal.Trigger>
        <Button onClick={() => setIsOpen(true)}>Share publication</Button>
    </ShareModal.Trigger>
    <ShareModal.Content data-testid="publication-share-modal">
        <ShareModal.Header className="flex-row items-center justify-between gap-4 space-y-0 text-left">
            <ShareModal.Title className="text-2xl">Share your publication</ShareModal.Title>
            <ShareModal.CloseButton onClick={() => setIsOpen(false)} />
        </ShareModal.Header>
        <ShareModal.Preview className="rounded-lg bg-card" href={publicationUrl}>
            <div className="aspect-video bg-cover bg-center" style={{backgroundImage: \`url(\${imageURL})\`}} />
            <div className="p-5">
                <div className="text-lg font-semibold">Ghost Journal</div>
                <p className="mt-1 text-sm text-muted-foreground">Thoughts, stories and ideas.</p>
            </div>
        </ShareModal.Preview>
        <p className="text-sm text-muted-foreground">Set your publication's cover image and description in Design settings.</p>
        <ShareModal.Footer>
            <ShareModal.SocialLinks links={socialLinks} />
            <ShareModal.CopyButton className="ml-0! grow cursor-pointer" copyURL={publicationUrl} />
        </ShareModal.Footer>
    </ShareModal.Content>
</ShareModal.Root>`;

export const Post: Story = {
    render: () => {
        const PostExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal.Root open={isOpen} onOpenChange={setIsOpen}>
                    <ShareModal.Trigger>
                        <Button onClick={() => setIsOpen(true)}>Share post</Button>
                    </ShareModal.Trigger>
                    <ShareModal.Content>
                        <div className="sticky top-0 ml-auto size-0">
                            <ShareModal.CloseButton className="absolute -top-5 -right-5" onClick={() => setIsOpen(false)} />
                        </div>
                        <ShareModal.Header className="relative -mt-5">
                            <ShareModal.Title className="text-3xl leading-[1.15em] font-bold">
                                <span className="text-state-success">Your post is published.</span>
                                <br />
                                <span>Spread the word!</span>
                            </ShareModal.Title>
                            <ShareModal.Description className="mb-0 pt-1 pb-0 text-lg text-foreground">
                                Your post was published on your site and sent to <strong>3 subscribers</strong> of <strong>Ghost Blog</strong>, on <strong>June 13th</strong> at <strong>12:02</strong>.
                            </ShareModal.Description>
                        </ShareModal.Header>
                        <PostPreview />
                        <ShareModal.Footer>
                            <ShareModal.SocialLinks links={postSocialLinks} />
                            <ShareModal.CopyButton className="ml-0! grow cursor-pointer" copyURL={postUrl} />
                        </ShareModal.Footer>
                    </ShareModal.Content>
                </ShareModal.Root>
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
    render: () => {
        const PublicationExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal.Root open={isOpen} onOpenChange={setIsOpen}>
                    <ShareModal.Trigger>
                        <Button onClick={() => setIsOpen(true)}>Share publication</Button>
                    </ShareModal.Trigger>
                    <ShareModal.Content data-testid="publication-share-modal">
                        <ShareModal.Header className="flex-row items-center justify-between gap-4 space-y-0 text-left">
                            <ShareModal.Title className="text-2xl">Share your publication</ShareModal.Title>
                            <ShareModal.CloseButton onClick={() => setIsOpen(false)} />
                        </ShareModal.Header>
                        <PublicationPreview />
                        <p className="text-sm text-muted-foreground">
                            Set your publication&apos;s cover image and description in <Button className="h-auto p-0 align-baseline text-sm text-green hover:text-green/90" variant="link" asChild><a href="#/settings/design/edit?ref=setup">Design settings</a></Button>.
                        </p>
                        <ShareModal.Footer>
                            <ShareModal.SocialLinks links={publicationSocialLinks} />
                            <ShareModal.CopyButton className="ml-0! grow cursor-pointer" copyURL={publicationUrl} />
                        </ShareModal.Footer>
                    </ShareModal.Content>
                </ShareModal.Root>
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

export const StackedActions: Story = {
    render: () => {
        const StackedExample = () => {
            const [isOpen, setIsOpen] = useState(false);

            return (
                <ShareModal.Root open={isOpen} onOpenChange={setIsOpen}>
                    <ShareModal.Trigger>
                        <Button onClick={() => setIsOpen(true)}>Open stacked share modal</Button>
                    </ShareModal.Trigger>
                    <ShareModal.Content>
                        <ShareModal.Header className="flex-row items-center justify-between gap-4 space-y-0 text-left">
                            <ShareModal.Title className="text-2xl">Share your publication</ShareModal.Title>
                            <ShareModal.CloseButton onClick={() => setIsOpen(false)} />
                        </ShareModal.Header>
                        <PublicationPreview />
                        <ShareModal.CopyURLBox copyURL={publicationUrl}>
                            <ShareModal.CopyButton
                                copyURL={publicationUrl}
                                icon="copy"
                                size="sm"
                                variant="outline"
                            />
                        </ShareModal.CopyURLBox>
                        <ShareModal.SocialLinks layout="stacked" links={publicationSocialLinks} />
                    </ShareModal.Content>
                </ShareModal.Root>
            );
        };

        return <StackedExample />;
    }
};
