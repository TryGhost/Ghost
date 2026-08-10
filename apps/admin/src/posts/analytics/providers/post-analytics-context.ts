import {type Post as PostBase} from '@tryghost/admin-x-framework/api/posts';
import {createContext, useContext} from 'react';

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

// PostAnalyticsProvider owns only post-scoped state: the routed post and the
// selected date range. Framework data (config/site/settings/tinybird) is read
// from the shell's FrameworkProvider via `useAnalyticsData` — it is NOT stored
// here.
export type PostAnalyticsContextType = {
    postId: string;
    post: Post | undefined;
    isPostLoading: boolean;
    range: number;
    setRange: (value: number) => void;
}

export const PostAnalyticsContext = createContext<PostAnalyticsContextType | undefined>(undefined);

export const usePostAnalytics = () => {
    const context = useContext(PostAnalyticsContext);
    if (!context) {
        throw new Error('usePostAnalytics must be used within a PostAnalyticsProvider');
    }
    return context;
};
