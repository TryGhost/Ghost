import { getEmailStatsPollingOptions } from '@/posts/analytics/utils/email-stats-polling';
import { processAndGroupTopLinks } from '@/posts/analytics/utils/link-helpers';
import { useEmailSendingStatusContext } from '@/posts/analytics/email-sending-status/email-sending-status-context';
import { useEmailTrackClicks } from '@tryghost/admin-x-framework/api/settings';
import { useMemo } from 'react';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { useTopLinks } from '@tryghost/admin-x-framework/api/links';

export const usePostTopLinks = ({ pausePolling = false }: { pausePolling?: boolean } = {}) => {
  const { post, postId } = usePostAnalytics();
  const { isNewsletterDataHidden } = useEmailSendingStatusContext();
  const emailTrackClicksEnabled = useEmailTrackClicks();

  const {
    data: linksResponse,
    isLoading,
    refetch,
  } = useTopLinks({
    ...(pausePolling ? {} : getEmailStatsPollingOptions(() => post?.email)),
    enabled: !!emailTrackClicksEnabled && !isNewsletterDataHidden,
    searchParams: {
      filter: `post_id:'${postId}'`,
    },
  });

  const topLinks = useMemo(() => processAndGroupTopLinks(linksResponse), [linksResponse]);

  return { topLinks, isLoading, refetch };
};
