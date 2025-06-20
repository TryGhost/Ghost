import {Activity} from '../api/activitypub';
import {postsActions} from './posts-store';
import {useEffect} from 'react';

// Hook to sync React Query data with Valtio store for experiment
export function useSyncPostsWithStore(
    feedData: {pages: {posts: Activity[]}[]} | undefined,
    inboxData: {pages: {posts: Activity[]}[]} | undefined
) {
    useEffect(() => {
        if (feedData?.pages) {
            const allFeedPosts = feedData.pages.flatMap(page => page.posts);
            postsActions.setFeedPosts(allFeedPosts);
        }
    }, [feedData]);

    useEffect(() => {
        if (inboxData?.pages) {
            const allInboxPosts = inboxData.pages.flatMap(page => page.posts);
            postsActions.setInboxPosts(allInboxPosts);
        }
    }, [inboxData]);
}