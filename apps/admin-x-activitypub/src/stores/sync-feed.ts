import {Activity} from '../api/activitypub';
import {feedActions} from './feed-store';
import {useEffect} from 'react';

interface PaginatedResponse {
    pages: {posts: Activity[]}[];
}

export function useSyncFeedWithStore(data: PaginatedResponse | undefined) {
    useEffect(() => {
        if (data?.pages) {
            // Flatten all pages into a single array of posts
            const allPosts = data.pages.flatMap(page => page.posts);
            feedActions.setPosts(allPosts);
        }
    }, [data]);
}