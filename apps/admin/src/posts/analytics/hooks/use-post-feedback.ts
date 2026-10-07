import { usePostFeedbackQuery } from '@tryghost/admin-x-framework/api/feedback';
import {
  type PollingEmail,
  getEmailStatsPollingOptions,
} from '@/posts/analytics/utils/email-stats-polling';
import { useMemo } from 'react';

// Pass the post's email to poll the list on the same schedule as the counts.
export const usePostFeedback = (postId: string, score?: number, email?: PollingEmail | null) => {
  const {
    data: feedbackResponse,
    isLoading,
    error,
  } = usePostFeedbackQuery(postId, {
    ...getEmailStatsPollingOptions(() => email),
    searchParams: {
      limit: '50', // Get more data for pagination
      ...(score !== undefined ? { score: score.toString() } : {}),
    },
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
    error,
  };
};
