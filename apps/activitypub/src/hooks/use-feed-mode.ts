import {useState} from 'react';

export type FeedMode = 'discover' | 'following';

export const FEED_MODE_STORAGE_KEY = 'ghost-ap-reader-feed';

export const useFeedMode = () => {
    const [feedMode, setFeedModeState] = useState<FeedMode>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(FEED_MODE_STORAGE_KEY);
            return (stored === 'following' ? 'following' : 'discover') as FeedMode;
        }
        return 'discover';
    });

    const setFeedMode = (mode: FeedMode) => {
        setFeedModeState(mode);
        localStorage.setItem(FEED_MODE_STORAGE_KEY, mode);
    };

    return {feedMode, setFeedMode};
};
