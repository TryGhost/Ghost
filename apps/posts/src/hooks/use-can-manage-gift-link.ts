import {canManageGiftLinks} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useGlobalData} from '@src/providers/post-analytics-context';
import {useMemo} from 'react';

// Whether the current user can manage a gift link for this post. Mirrors
// canCopyGiftLink in the Ember app/utils/gift-link.js.
export const useCanManageGiftLink = (post?: {status?: string; visibility?: string}) => {
    const {data: globalData} = useGlobalData();
    const {data: currentUser} = useCurrentUser();

    return useMemo(() => {
        if (!globalData?.labs?.giftLinks || !post || !currentUser) {
            return false;
        }
        const eligible = post.status === 'published' && Boolean(post.visibility) && post.visibility !== 'public';
        return eligible && canManageGiftLinks(currentUser);
    }, [globalData?.labs?.giftLinks, post, currentUser]);
};
