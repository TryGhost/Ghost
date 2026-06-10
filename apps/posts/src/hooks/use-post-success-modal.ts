import React from 'react';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useEffect, useMemo, useState} from 'react';

interface PublishedPostData {
    id: string;
    type: string;
}

interface ExtendedPost extends Post {
    newsletter?: {
        name: string;
    };
}

type SuccessVariant = 'published' | 'scheduled';

/**
 * Consumes the `ghost-last-scheduled-post` / `ghost-last-published-post`
 * localStorage keys the publish flow writes before redirecting (Ember parity:
 * posts-list/list.js) and opens the post-success share modal.
 */
export const usePostSuccessModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [publishedPostData, setPublishedPostData] = useState<PublishedPostData | null>(null);
    const [variant, setVariant] = useState<SuccessVariant>('published');
    const [postCount, setPostCount] = useState<number | null>(null);
    const {data: siteData} = useBrowseSite({enabled: !!publishedPostData});

    const isPage = publishedPostData?.type === 'page';

    // Fetch the published post (or page) data if we have it
    const {data: postResponse} = useBrowsePosts({
        searchParams: publishedPostData ? {
            filter: `id:${publishedPostData.id}`,
            include: 'authors,newsletter,email'
        } : {},
        enabled: !!publishedPostData && !isPage
    });
    const {data: pageResponse} = useBrowsePages({
        searchParams: publishedPostData ? {
            filter: `id:${publishedPostData.id}`,
            include: 'authors'
        } : {},
        enabled: !!publishedPostData && isPage
    });

    // Fetch total published post count (only shown for published posts)
    const {data: postCountResponse} = useBrowsePosts({
        searchParams: {
            filter: 'status:[published,sent]',
            limit: '1',
            fields: 'id'
        },
        enabled: !!publishedPostData && variant === 'published'
    });

    const post = (isPage
        ? (pageResponse?.pages?.[0] as unknown as ExtendedPost | undefined)
        : (postResponse?.posts?.[0] as ExtendedPost | undefined));

    const site = siteData?.site;

    // Helper functions for formatting
    const formatSubscriberCount = (count: number) => {
        return `${count.toLocaleString()} subscriber${count !== 1 ? 's' : ''}`;
    };

    const formatPublicationTime = (publishedAt: string) => {
        return new Date(publishedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const getAuthorsText = (authors?: {name: string}[]) => {
        return authors?.map(author => author.name).join(', ') || '';
    };

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength).trim() + '…';
    };

    // Memoized modal props
    const modalProps = useMemo(() => {
        if (!post) {
            return null;
        }

        const isScheduled = variant === 'scheduled';
        const typeWord = isPage ? 'page' : 'post';
        const showPostCount = !isScheduled && !!postCount;

        // Build description with React elements to match Ember modal format with bold text
        const getDescription = () => {
            const parts = [];

            if (isScheduled) {
                if (post.email_only) {
                    parts.push('Your email will be sent to');
                } else if (post.email?.email_count) {
                    parts.push('Your post will be published on your site and sent to');
                } else {
                    parts.push(`Your ${typeWord} will be published on your site`);
                }
            } else if (post.email_only) {
                parts.push('Your email was sent to');
            } else if (post.email?.email_count) {
                parts.push('Your post was published on your site and sent to');
            } else {
                parts.push(`Your ${typeWord} was published on your site`);
            }

            if (post.email?.email_count) {
                const subscriberText = formatSubscriberCount(post.email.email_count);
                parts.push(' ');
                parts.push(React.createElement('strong', {key: 'subscriber-count'}, subscriberText));

                if (post.newsletter?.name) {
                    parts.push(' of ');
                    parts.push(React.createElement('strong', {key: 'newsletter-name'}, post.newsletter.name));
                }
                parts.push(',');
            }

            if (post.published_at) {
                const publishedDate = new Date(post.published_at);
                const isToday = publishedDate.toDateString() === new Date().toDateString();

                if (isToday) {
                    parts.push(' ');
                    parts.push(React.createElement('strong', {key: 'today'}, 'today'));
                } else {
                    parts.push(' on ');
                    parts.push(React.createElement('strong', {key: 'date'}, publishedDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric'})));
                }
                parts.push(' at ');
                parts.push(React.createElement('strong', {key: 'time'}, formatPublicationTime(post.published_at)));
            }

            parts.push('.');

            return React.createElement('span', {}, ...parts);
        };

        const handleClose = () => {
            setIsModalOpen(false);
            setPublishedPostData(null);
            setPostCount(null);
        };

        return {
            open: isModalOpen,
            onOpenChange: (open: boolean) => {
                if (!open) {
                    handleClose();
                }
            },
            emailOnly: post.email_only,
            postURL: post.url || '',
            primaryTitle: isScheduled ? 'All set!' : 'Boom! It\'s out there.',
            secondaryTitle: showPostCount && postCount ?
                `That's ${postCount.toLocaleString()} post${postCount !== 1 ? 's' : ''} published.` :
                'Spread the word!',
            description: getDescription(),
            featureImageURL: post.feature_image || '',
            postTitle: post.title || '',
            postExcerpt: truncateText(post.excerpt || '', 100),
            faviconURL: site?.icon || '',
            siteTitle: site?.title || '',
            author: getAuthorsText(post.authors),
            onClose: handleClose
        };
    }, [post, isModalOpen, postCount, variant, isPage, site?.icon, site?.title]);

    useEffect(() => {
        const checkForPublishedPost = () => {
            try {
                // Ember parity: both keys are consumed and cleared; when both
                // are present the published modal wins (Ember opened it last)
                const scheduledData = localStorage.getItem('ghost-last-scheduled-post');
                const publishedData = localStorage.getItem('ghost-last-published-post');

                if (scheduledData) {
                    localStorage.removeItem('ghost-last-scheduled-post');
                }
                if (publishedData) {
                    localStorage.removeItem('ghost-last-published-post');
                }

                const storedData = publishedData ?? scheduledData;
                if (storedData) {
                    const parsedData: PublishedPostData = JSON.parse(storedData);
                    setVariant(publishedData ? 'published' : 'scheduled');
                    setPublishedPostData(parsedData);
                    setIsModalOpen(true);
                }
            } catch {
                // Ignore localStorage errors
            }
        };

        // Check immediately on mount and after a small delay to ensure the route has loaded
        checkForPublishedPost();
        const timeoutId = setTimeout(checkForPublishedPost, 100);

        return () => clearTimeout(timeoutId);
    }, []);

    // Update post count when we get the response
    useEffect(() => {
        if (postCountResponse?.meta?.pagination?.total) {
            setPostCount(postCountResponse.meta.pagination.total);
        }
    }, [postCountResponse]);

    const closeModal = () => {
        setIsModalOpen(false);
        setPublishedPostData(null);
        setPostCount(null);
    };

    return {
        isModalOpen,
        post,
        postCount,
        showPostCount: !!postCount,
        closeModal,
        modalProps
    };
};
