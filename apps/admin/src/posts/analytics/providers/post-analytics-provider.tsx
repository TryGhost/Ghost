import {POST_ANALYTICS_INCLUDE} from '@/posts/analytics/utils/constants';
import {STATS_RANGES} from '@/shared/analytics/constants';
import {PostAnalyticsContext} from '@/posts/analytics/providers/post-analytics-context';
import {type ReactNode, useState} from 'react';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useParams} from '@tryghost/admin-x-framework';

// Slim provider: holds only post-scoped state (the routed post + selected date
// range). Framework data is sourced from the shell via `useAnalyticsData`.
const PostAnalyticsProvider = ({children}: { children: ReactNode }) => {
    const {postId} = useParams();

    // Validate that postId exists - the app cannot function without it
    if (!postId) {
        throw new Error('Post ID is required for PostAnalyticsProvider');
    }

    const [range, setRange] = useState(STATS_RANGES.last30Days.value);

    // Fetch post data with all required includes. The gift-link modal reuses
    // POST_ANALYTICS_INCLUDE for the same query key, so both read one cached post.
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: POST_ANALYTICS_INCLUDE
        }
    });

    return <PostAnalyticsContext.Provider value={{
        postId: postId,
        post: post,
        isPostLoading,
        range,
        setRange
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
