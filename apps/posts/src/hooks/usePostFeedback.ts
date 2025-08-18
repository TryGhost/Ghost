import {getPostFeedback} from '@tryghost/admin-x-framework/api/feedback';
import {useMemo} from 'react';

export const usePostFeedback = (postId: string, score?: number) => {
    const {data: feedbackResponse, isLoading, error} = getPostFeedback(postId, {
        searchParams: {
            limit: '50', // Get more data for pagination
            ...(score !== undefined ? {score: score.toString()} : {})
        }
    });

    const feedback = useMemo(() => {
        if (!feedbackResponse?.feedback) {
            return [];
        }
        return feedbackResponse.feedback;
    }, [feedbackResponse]);

    return {
        feedback,
        isLoading,
        error
    };
}; 