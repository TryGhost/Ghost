import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Post as PostBase} from '@tryghost/admin-x-framework/api/posts';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type StatsConfig} from '@tryghost/admin-x-framework';
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

export type PostAnalyticsContextType = {
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
}

export const PostAnalyticsContext = createContext<PostAnalyticsContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(PostAnalyticsContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a PostAnalyticsProvider');
    }
    return context;
};
