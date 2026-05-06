import ShareModal, {type ShareModalSocialLink} from '@/components/features/share-modal/share-modal';
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
        <ShareModal
            actionsLayout="footer"
            copyURL={postURL}
            description={description}
            footerAction={emailOnly ? (
                <Button className="cursor-pointer" type="button" onClick={onClose}>
                    Close
                </Button>
            ) : undefined}
            preview={{
                description: postExcerpt,
                imageURL: featureImageURL,
                meta: (
                    <div className="mt-2 flex items-start gap-2">
                        <div className="mt-0.5 size-4 bg-cover bg-center" style={{backgroundImage: `url(${faviconURL})`}}></div>
                        <div className="flex gap-1">
                            <strong>{siteTitle}</strong>
                            <span>&bull;</span>
                            <span>{author}</span>
                        </div>
                    </div>
                ),
                title: postTitle,
                url: postURL
            }}
            primaryTitle={primaryTitle}
            secondaryTitle={secondaryTitle}
            socialLinks={socialLinks}
            variant="post"
            onClose={onClose}
            {...props}
        >
            {children}
        </ShareModal>
    );
};

export default PostShareModal;
