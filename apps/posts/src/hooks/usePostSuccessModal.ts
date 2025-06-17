import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useEffect, useState} from 'react';

interface PublishedPostData {
    id: string;
    type: string;
}

export const usePostSuccessModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [publishedPostData, setPublishedPostData] = useState<PublishedPostData | null>(null);
    const [postCount, setPostCount] = useState<number | null>(null);
    
    // Fetch the published post data if we have it
    const {data: postResponse} = useBrowsePosts({
        searchParams: publishedPostData ? {
            filter: `id:${publishedPostData.id}`,
            include: 'authors,tags'
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
    
    const post = postResponse?.posts?.[0] as Post | undefined;

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
        showPostCount: !!postCount, // Show post count if we have it
        closeModal
    };
}; 