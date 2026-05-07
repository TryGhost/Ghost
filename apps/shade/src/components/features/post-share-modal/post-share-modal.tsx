import ShareModal, {type ShareModalSocialLink} from '@/components/features/share-modal/share-modal';
import {H3} from '@/components/layout/heading';
import {Button} from '@/components/ui/button';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import React from 'react';

interface PostShareModalProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
    author?: string;
    children?: React.ReactNode;
    description?: React.ReactNode;
    emailOnly?: boolean;
    faviconURL?: string;
    featureImageURL?: string;
    onClose?: () => void;
    postExcerpt?: string;
    postTitle?: string;
    postURL?: string;
    primaryTitle?: string;
    secondaryTitle?: string;
    siteTitle?: string;
}

const PostShareModal: React.FC<PostShareModalProps> = ({
    author = '',
    children,
    description = '',
    emailOnly = false,
    faviconURL = '',
    featureImageURL = '',
    onClose = () => {},
    postExcerpt = '',
    postTitle = '',
    postURL = '',
    primaryTitle = 'Your post is published.',
    secondaryTitle = 'Spread the word!',
    siteTitle = '',
    ...props
}) => {
    const encodedPostTitle = encodeURIComponent(postTitle);
    const encodedPostURL = encodeURIComponent(postURL);
    const encodedPostURLTitle = encodeURIComponent(`${postTitle} ${postURL}`);
    const socialLinks: ShareModalSocialLink[] = emailOnly ? [] : [
        {
            href: `https://twitter.com/intent/tweet?text=${encodedPostTitle}%0A${encodedPostURL}`,
            label: 'Share on X',
            service: 'x'
        },
        {
            href: `https://threads.net/intent/post?text=${encodedPostURLTitle}`,
            label: 'Share on Threads',
            service: 'threads'
        },
        {
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedPostURL}`,
            label: 'Share on Facebook',
            service: 'facebook'
        },
        {
            href: `https://www.linkedin.com/shareArticle?mini=true&title=${encodedPostTitle}&url=${encodedPostURL}`,
            label: 'Share on LinkedIn',
            service: 'linkedin'
        }
    ];

    return (
        <ShareModal.Root {...props}>
            {children && (
                <ShareModal.Trigger>
                    {children}
                </ShareModal.Trigger>
            )}
            <ShareModal.Content>
                <div className="sticky top-0 ml-auto size-0">
                    <ShareModal.CloseButton className="absolute -top-5 -right-5" onClick={onClose} />
                </div>
                <ShareModal.Header className="relative -mt-5">
                    <ShareModal.Title className="text-3xl leading-[1.15em] font-bold">
                        {primaryTitle && <span className="text-state-success">{primaryTitle}</span>}
                        {primaryTitle && secondaryTitle && <br />}
                        {secondaryTitle && <span>{secondaryTitle}</span>}
                    </ShareModal.Title>
                    {description && (
                        <ShareModal.Description className="mb-0 pt-1 pb-0 text-lg text-foreground">
                            {description}
                        </ShareModal.Description>
                    )}
                </ShareModal.Header>
                <ShareModal.Preview className="rounded-md" href={postURL}>
                    {featureImageURL && (
                        <div className="aspect-video bg-cover bg-center" style={{backgroundImage: `url(${featureImageURL})`}}></div>
                    )}
                    <div className="p-6 pt-5">
                        <H3>{postTitle}</H3>
                        {postExcerpt && (
                            <p>{postExcerpt}</p>
                        )}
                        <div className="mt-2 flex items-start gap-2">
                            <div className="mt-0.5 size-4 bg-cover bg-center" style={{backgroundImage: `url(${faviconURL})`}}></div>
                            <div className="flex gap-1">
                                <strong>{siteTitle}</strong>
                                <span>&bull;</span>
                                <span>{author}</span>
                            </div>
                        </div>
                    </div>
                </ShareModal.Preview>
                <ShareModal.Footer>
                    {emailOnly ? (
                        <Button className="cursor-pointer" type="button" onClick={onClose}>
                            Close
                        </Button>
                    ) : (
                        <>
                            <ShareModal.SocialLinks links={socialLinks} />
                            <ShareModal.CopyButton
                                className="ml-0! grow cursor-pointer"
                                copyURL={postURL}
                                icon="link"
                            />
                        </>
                    )}
                </ShareModal.Footer>
            </ShareModal.Content>
        </ShareModal.Root>
    );
};

export default PostShareModal;
