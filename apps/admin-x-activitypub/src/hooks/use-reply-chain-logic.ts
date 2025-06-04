import {Activity, Post, ReplyChainResponse} from '@src/api/activitypub';
import {mapPostToActivity} from '@src/utils/posts';
import {useState} from 'react';

export interface ThreadChildItem {
    activity: Activity;
    isChainContinuation: boolean;
    chainId?: string;
    showRepliesButton?: boolean;
    remainingCount?: number;
}

export const useReplyChainLogic = (replyChain: ReplyChainResponse | undefined) => {
    const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

    const toggleChain = (chainId: string) => {
        setExpandedChains((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(chainId)) {
                newSet.delete(chainId);
            } else {
                newSet.add(chainId);
            }
            return newSet;
        });
    };

    const threadChildren: ThreadChildItem[] = [];

    replyChain?.children.forEach((child: {post: Post, chain: Post[]}, childIndex: number) => {
        const childActivity = mapPostToActivity(child.post);
        const chainId = `chain-${childIndex}`;
        const isChainExpanded = expandedChains.has(chainId);

        threadChildren.push({
            activity: childActivity,
            isChainContinuation: false,
            chainId
        });

        if (child.chain.length > 0) {
            if (child.chain.length === 1 || isChainExpanded) {
                child.chain.forEach((chainPost: Post) => {
                    threadChildren.push({
                        activity: mapPostToActivity(chainPost),
                        isChainContinuation: true,
                        chainId
                    });
                });
            } else {
                threadChildren.push({
                    activity: mapPostToActivity(child.chain[0]),
                    isChainContinuation: true,
                    chainId,
                    showRepliesButton: true,
                    remainingCount: child.chain.length - 1
                });
            }
        }
    });

    return {
        threadChildren,
        toggleChain,
        expandedChains
    };
};
