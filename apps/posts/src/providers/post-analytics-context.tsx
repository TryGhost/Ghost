import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {Page as PageBase, useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {Post as PostBase, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_RANGES} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useParams} from '@tryghost/admin-x-framework';

export type ContentType = 'post' | 'page';

// Comprehensive analytics content type with all the includes we fetch in PostAnalytics
export interface Post extends Omit<PageBase, keyof PostBase>, PostBase {
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
    contentType: ContentType;
    analyticsBasePath: string;
    editorPath: string;
    listPath: string;
}

const PostAnalyticsContext = createContext<PostAnalyticsContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(PostAnalyticsContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a PostAnalyticsProvider');
    }
    return context;
};

const PostAnalyticsProvider = ({children, contentType = 'post'}: { children: ReactNode; contentType?: ContentType }) => {
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

    const isPage = contentType === 'page';

    // Fetch content data with all required includes. Both hooks are called to keep hook ordering stable;
    // the inactive query is disabled.
    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            include: 'email,authors,tags,tiers,count.clicks,count.signups,count.paid_conversions,count.positive_feedback,count.negative_feedback,newsletter'
        },
        enabled: !isPage
    });
    const {data: {pages: [page]} = {pages: []}, isLoading: isPageLoading} = useBrowsePages({
        searchParams: {
            filter: `id:${postId}`,
            include: 'authors,tags,tiers,count.signups,count.paid_conversions'
        },
        enabled: isPage
    });

    const content = isPage ? page : post;

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
        post: content as Post | undefined,
        isPostLoading: isPage ? isPageLoading : isPostLoading,
        contentType,
        analyticsBasePath: `/${isPage ? 'pages' : 'posts'}/analytics/${postId}`,
        editorPath: `/editor/${isPage ? 'page' : 'post'}/${postId}`,
        listPath: `/${isPage ? 'pages' : 'posts'}/`
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
