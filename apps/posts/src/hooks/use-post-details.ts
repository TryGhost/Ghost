import {GiftLinkResource} from '@tryghost/admin-x-framework/api/gift-links';
import {POST_ANALYTICS_INCLUDE} from '@src/utils/constants';
import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';

// The post/page fields the gift-link modal needs: the canonical URL to hang the
// token off, the visibility for the copy, and the uuid for usage stats.
export interface PostDetails {
    url: string;
    title: string;
    visibility?: string;
    uuid?: string;
}

// Fetches the details for a post or page by id. Posts reuse the post-analytics
// query (same include → shared cache with the analytics screen); pages fetch on
// their own route. Gated pages are eligible for gift links too, hence both.
export const usePostDetails = ({postId, resource = 'posts', enabled = true}: {
    postId: string;
    resource?: GiftLinkResource;
    enabled?: boolean;
}): {post: PostDetails | undefined; isLoading: boolean} => {
    const isPost = resource === 'posts';

    const {data: postsData, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {filter: `id:${postId}`, include: POST_ANALYTICS_INCLUDE},
        enabled: enabled && isPost
    });

    const {data: pagesData, isLoading: isPageLoading} = useBrowsePages({
        searchParams: {filter: `id:${postId}`},
        enabled: enabled && !isPost
    });

    if (isPost) {
        const post = postsData?.posts?.[0];
        return {
            post: post && {url: post.url, title: post.title, visibility: post.visibility, uuid: post.uuid},
            isLoading: isPostLoading
        };
    }

    // The Page type omits visibility/uuid, but the API returns them (shared
    // posts table); read them through a widened view.
    const page = pagesData?.pages?.[0] as undefined | {url: string; title: string; visibility?: string; uuid?: string};
    return {
        post: page && {url: page.url, title: page.title, visibility: page.visibility, uuid: page.uuid},
        isLoading: isPageLoading
    };
};
