import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { POST_ANALYTICS_INCLUDE } from '@/shared/analytics/constants';
import { getEmailStatsRefetchInterval } from '@/posts/analytics/utils/email-stats-polling';

export const usePostStatsPolling = (postId: string) =>
  useBrowsePosts({
    searchParams: {
      filter: `id:${postId}`,
      include: POST_ANALYTICS_INCLUDE,
    },
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      query.state.status === 'error'
        ? false
        : getEmailStatsRefetchInterval(query.state.data?.posts[0]?.email?.submitted_at),
  });
