import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {PAGE_ANALYTICS_INCLUDE, POST_ANALYTICS_INCLUDE, STATS_RANGES} from '@src/utils/constants';
import {Post as PostBase, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {ReactNode, createContext, useContext, useState} from 'react';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useParams} from '@tryghost/admin-x-framework';

// Comprehensive Post type with all the includes we fetch in PostAnalytics
export interface Post extends PostBase {
    published_at?: string;
    excerpt?: string;
    authors?: {
        name: string;
    }[];
    email?: {
        opened_count: number;
        email_count: number;
        status?: string;
    };
    newsletter?: {
        feedback_enabled?: boolean;
    };
    count?: {
        positive_feedback?: number;
        negative_feedback?: number;
        clicks?: number;
        signups?: number;
        paid_conversions?: number;
    };
    tags?: object[];
    tiers?: object[];
}

type PostAnalyticsContextType = {
    data: Config | undefined;
    site: {
        url?: string;
        icon?: string;
        title?: string;
    } | undefined;
    statsConfig: StatsConfig | undefined;
    tinybirdToken: string | undefined;
    isLoading: boolean;
    range: number;
    setRange: (value: number) => void;
    settings: Setting[];
    postId: string;
    post: Post | undefined;
    isPostLoading: boolean;
    // Whether the analyzed resource is a post or a page. The screen is shared:
    // the pages list links here too, but the posts endpoint never returns pages.
    postType: 'post' | 'page';
}

const PostAnalyticsContext = createContext<PostAnalyticsContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(PostAnalyticsContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a PostAnalyticsProvider');
    }
    return context;
};

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
    
    // Only fetch Tinybird token if stats config is present
    const hasStatsConfig = Boolean(config.data?.config?.stats);
    const tinybirdTokenQuery = useTinybirdToken({enabled: hasStatsConfig});

    // Fetch post data with all required includes. The gift-link modal reuses
    // POST_ANALYTICS_INCLUDE for the same query key, so both read one cached post.
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostQueryLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: POST_ANALYTICS_INCLUDE
        }
    });

    // Pages reach this same screen (the pages list links to /posts/analytics/:id)
    // but never come back from the posts endpoint. When the post lookup resolves
    // empty, fall back to the pages endpoint so page analytics — and the
    // gift-link eligibility that reads status/visibility — work too.
    const isPageFallbackEnabled = !isPostQueryLoading && !post;
    const {data: {pages: [page]} = {pages: []}, isLoading: isPageQueryLoading} = useBrowsePages({
        searchParams: {
            filter: `id:${postId}`,
            include: PAGE_ANALYTICS_INCLUDE
        },
        enabled: isPageFallbackEnabled
    });

    // A page only stands in when the post lookup came back empty; if neither
    // resolves (e.g. a bad id) we fall through as a post.
    const isPage = !post && Boolean(page);
    const resolvedPost = (post ?? page) as Post | undefined;
    const postType = isPage ? 'page' as const : 'post' as const;
    const isPostLoading = isPostQueryLoading || (isPageFallbackEnabled && isPageQueryLoading);

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
        throw error;
    }

    const siteData = site.data?.site ? {
        url: site.data.site.url as string,
        icon: site.data.site.icon as string,
        title: site.data.site.title as string
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
        post: resolvedPost,
        isPostLoading,
        postType
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
