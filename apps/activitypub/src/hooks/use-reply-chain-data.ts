import {mapPostToActivity} from '@src/utils/posts';
import {useReplyChainForUser} from '@hooks/use-activity-pub-queries';

interface UseReplyChainDataOptions {
    includeAncestors?: boolean;
}

export function useReplyChainData(postId: string, options: UseReplyChainDataOptions = {}) {
    const {includeAncestors = false} = options;

    const {data: replyChain, isLoading: isReplyChainLoading, loadMoreChildren, loadMoreChildReplies, hasMoreChildren, hasMoreChildReplies} = useReplyChainForUser('index', postId);

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
}
