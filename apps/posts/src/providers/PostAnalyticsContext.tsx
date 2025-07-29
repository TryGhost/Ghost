import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {Post as PostBase, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_RANGES} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
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
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
    settings: Setting[];
    postId: string;
    post: Post | undefined;
    isPostLoading: boolean;
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

    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);

    // Fetch post data with all required includes
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: 'email,authors,tags,tiers,count.clicks,count.signups,count.paid_conversions,count.positive_feedback,count.negative_feedback,newsletter'
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
        audience,
        setAudience,
        settings: settings.data?.settings || [],
        postId: postId, 
        post: post as Post | undefined, 
        isPostLoading
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
