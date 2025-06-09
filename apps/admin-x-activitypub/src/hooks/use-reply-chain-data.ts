import {mapPostToActivity} from '@src/utils/posts';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {usePostForUser, useReplyChainForUser, useThreadForUser} from '@hooks/use-activity-pub-queries';

interface UseReplyChainDataOptions {
    includeAncestors?: boolean;
}

export function useReplyChainData(postId: string, options: UseReplyChainDataOptions = {}) {
    const {includeAncestors = false} = options;
    const {isEnabled} = useFeatureFlags();

    const shouldFetchReplyChain = isEnabled('reply-chain');

    const {data: replyChain, isLoading: isReplyChainLoading, loadMoreChildren, loadMoreChildReplies, hasMoreChildren, hasMoreChildReplies} = useReplyChainForUser('index', shouldFetchReplyChain ? postId : '');
    const {data: post, isLoading} = usePostForUser('index', shouldFetchReplyChain ? '' : postId);
    const {data: thread} = useThreadForUser('index', shouldFetchReplyChain ? '' : (shouldFetchReplyChain ? postId : (post?.id ?? '')));

    if (shouldFetchReplyChain) {
        const threadParents = includeAncestors ? (replyChain?.ancestors?.chain?.map(mapPostToActivity) || []) : [];
        const threadPost = replyChain?.post ? mapPostToActivity(replyChain.post) : undefined;
        const processedReplies = (replyChain?.children ?? []).map((childData) => {
            const mainReply = mapPostToActivity(childData.post);
            const chainItems = childData.chain ? childData.chain.map(mapPostToActivity) : [];

            return {
                mainReply,
                chain: chainItems
            };
        });

        return {
            threadParents,
            post: threadPost,
            processedReplies,
            isLoading: isReplyChainLoading,
            loadMoreChildren,
            loadMoreChildReplies,
            hasMoreChildren,
            hasMoreChildReplies
        };
    } else {
        // Fallback to old thread-based approach
        if (includeAncestors && thread?.posts) {
            const threadPostIdx = thread.posts.findIndex(item => item.object.id === postId);
            const threadChildren = thread.posts.slice(threadPostIdx + 1);
            const threadParents = thread.posts.slice(0, threadPostIdx);

            const processedReplies = threadChildren.map((item) => {
                return {
                    mainReply: item,
                    chain: []
                };
            });

            return {
                threadParents,
                post,
                processedReplies,
                isLoading,
                loadMoreChildren: () => Promise.resolve(),
                loadMoreChildReplies: () => Promise.resolve(),
                hasMoreChildren: false,
                hasMoreChildReplies: () => false
            };
        } else {
            // Reader case - filter out the main post and process only replies
            const mainPostId = post?.id;
            const mainObjectId = post?.object?.id;

            const replyPosts = (thread?.posts ?? []).filter((item) => {
                // Filter out the main post by comparing both activity ID and object ID
                return item.id !== mainPostId &&
                    item.object.id !== mainObjectId &&
                    item.id !== postId &&
                    item.object.id !== postId;
            });

            const processedReplies = replyPosts.map((item) => {
                return {
                    mainReply: item,
                    chain: []
                };
            });

            return {
                threadParents: [],
                post,
                processedReplies,
                isLoading,
                loadMoreChildren: () => Promise.resolve(),
                loadMoreChildReplies: () => Promise.resolve(),
                hasMoreChildren: false,
                hasMoreChildReplies: () => false
            };
        }
    }
}
