import React from 'react';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useEffect, useMemo, useState} from 'react';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

interface PublishedPostData {
    id: string;
    type: string;
}

interface ExtendedPost extends Post {
    authors?: {
        name: string;
    }[];
    excerpt?: string;
    newsletter?: {
        name: string;
    };
}

export const usePostSuccessModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [publishedPostData, setPublishedPostData] = useState<PublishedPostData | null>(null);
    const [postCount, setPostCount] = useState<number | null>(null);
    const {site} = useGlobalData();
    
    // Fetch the published post data if we have it
    const {data: postResponse} = useBrowsePosts({
        searchParams: publishedPostData ? {
            filter: `id:${publishedPostData.id}`,
            include: 'authors,newsletter,email'
        } : {},
        enabled: !!publishedPostData
    });
    
    // Fetch total published post count
    const {data: postCountResponse} = useBrowsePosts({
        searchParams: {
            filter: 'status:[published,sent]',
            limit: '1',
            fields: 'id'
        },
        enabled: !!publishedPostData
    });
    
    const post = postResponse?.posts?.[0] as ExtendedPost | undefined;

    // Helper functions for formatting
    const formatSubscriberCount = (count: number) => {
        return `${count} subscriber${count !== 1 ? 's' : ''}`;
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

        const showPostCount = !!postCount;
        
        // Build description with React elements to match Ember modal format with bold text
        const getDescription = () => {
            const parts = [];
            
            if (post.email_only) {
                parts.push('Your email was sent to');
            } else if (post.email?.email_count) {
                parts.push('Your post was published on your site and sent to');
            } else {
                parts.push('Your post was published on your site');
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
            primaryTitle: 'Boom! It\'s out there.',
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
    }, [post, isModalOpen, postCount, site?.title]);

    useEffect(() => {
        const checkForPublishedPost = () => {
            try {
                const storedData = localStorage.getItem('ghost-last-published-post');
                if (storedData) {
                    const parsedData: PublishedPostData = JSON.parse(storedData);
                    setPublishedPostData(parsedData);
                    setIsModalOpen(true);
                    
                    // Clean up localStorage
                    localStorage.removeItem('ghost-last-published-post');
                }
            } catch (error) {
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