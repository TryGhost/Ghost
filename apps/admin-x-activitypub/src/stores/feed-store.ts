import {Activity} from '../api/activitypub';
import {proxy, useSnapshot} from 'valtio';

interface FeedStore {
    posts: Activity[];
}

// Create the proxy store
export const feedStore = proxy<FeedStore>({
    posts: []
});

// Hook to use the store in components
export function useFeedStore() {
    return useSnapshot(feedStore);
}

// Store actions
export const feedActions = {
    // Set feed posts from React Query data
    setPosts(posts: Activity[]) {
        feedStore.posts = posts;
    }
};