import {POST_ANALYTICS_INCLUDE, STATS_RANGES} from '@/posts/analytics/utils/constants';
import {PostAnalyticsContext} from '@/posts/analytics/providers/post-analytics-context';
import {type ReactNode, useState} from 'react';
import {type StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useParams} from '@tryghost/admin-x-framework';

const PostAnalyticsProvider = ({children}: { children: ReactNode }) => {
    const {postId} = useParams();

    // Validate that postId exists - the app cannot function without it
    if (!postId) {
        throw new Error('Post ID is required for PostAnalyticsProvider');
    }

    const config = useBrowseConfig();
    const site = useBrowseSite();
    const [range, setRange] = useState(STATS_RANGES.LAST_30_DAYS.value);
    const settings = useBrowseSettings();

    // Fetch the token only when stats config is present; the web analytics
    // kill-switch is applied inside useTinybirdToken.
    const hasStatsConfig = Boolean(config.data?.config?.stats);
    const tinybirdTokenQuery = useTinybirdToken({enabled: hasStatsConfig});

    // Fetch post data with all required includes. The gift-link modal reuses
    // POST_ANALYTICS_INCLUDE for the same query key, so both read one cached post.
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: POST_ANALYTICS_INCLUDE
        }
    });

    // Check for errors in the ghost requests
    const ghostRequests = [config, site, settings];
    const ghostError = ghostRequests.map(request => request.error).find(Boolean);
    const tinybirdError = hasStatsConfig ? tinybirdTokenQuery.error : null;
    const error = ghostError || tinybirdError;

    // Check loading states
    const isGhostLoading = ghostRequests.some(request => request.isLoading);
    const isTinybirdLoading = hasStatsConfig ? tinybirdTokenQuery.isLoading : false;
    const isLoading = isGhostLoading || isTinybirdLoading;

    if (error) {
        throw error instanceof Error ? error : new Error('Failed to load post analytics data');
    }

    const siteData = site.data?.site ? {
        url: site.data.site.url,
        icon: site.data.site.icon,
        title: site.data.site.title
    } : undefined;

    return <PostAnalyticsContext.Provider value={{
        data: config.data?.config,
        site: siteData,
        statsConfig: config.data?.config?.stats as StatsConfig | undefined,
        tinybirdToken: tinybirdTokenQuery.token,
        isLoading,
        range,
        setRange,
        settings: settings.data?.settings || [],
        postId: postId,
        post: post,
        isPostLoading
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
