import {useState} from 'react';

export type FeedMode = 'discover' | 'following';

export const FEED_MODE_STORAGE_KEY = 'ghost-ap-reader-feed';

export const useFeedMode = (enabled: boolean) => {
    const [feedMode, setFeedModeState] = useState<FeedMode>(() => {
        if (!enabled) {
            return 'following';
        }

        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(FEED_MODE_STORAGE_KEY);
            return (stored === 'discover' ? 'discover' : 'following') as FeedMode;
        }
        return 'following';
    });

    const setFeedMode = (mode: FeedMode) => {
        setFeedModeState(mode);
        localStorage.setItem(FEED_MODE_STORAGE_KEY, mode);
    };

    return {feedMode, setFeedMode};
};
