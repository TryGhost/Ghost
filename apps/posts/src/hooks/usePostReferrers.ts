import {usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';
import {useMemo} from 'react';

export const usePostReferrers = (postId: string) => {
    const {data: postReferrerResponse, isLoading} = usePostReferrersAPI(postId);
    const stats = useMemo(() => postReferrerResponse?.stats || [], [postReferrerResponse]);

    return {
        isLoading,
        stats
    };
};
