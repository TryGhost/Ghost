import moment from 'moment-timezone';
import { formatQueryDate, setAllTimeStart } from '@/shared/analytics/chart-helpers';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useBrowseMembers } from '@tryghost/admin-x-framework/api/members';
import { useBrowsePages } from '@tryghost/admin-x-framework/api/pages';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { useTinybirdQuery } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';

// One row each, and no error toast: a lookup that fails simply doesn't count
const first = { limit: '1' };
const quiet = { defaultErrorHandler: false } as const;
// Posts and pages are looked up the same way
const firstPublished = {
  ...first,
  filter: 'status:published',
  order: 'published_at asc',
  fields: 'id,published_at',
};

/**
 * Finds where the site's history starts, so All time and the custom range
 * calendar start there: the earliest of its first published post or page,
 * first member and first visit. Imports keep their original dates, so a
 * migrated publication's history counts. Each lookup reads a single row
 * (the members API ignores fields, so that one comes back whole).
 *
 * A lookup that fails (an older server without the first-visit endpoint, a
 * missing permission) just doesn't count. Returns isLoading until all have
 * settled, so ranges are worked out once, with the start known.
 */
export const useAllTimeStart = (): { isLoading: boolean } => {
  const { statsConfig } = useAnalyticsData();
  const firstPost = useBrowsePosts({ ...quiet, searchParams: firstPublished });
  const firstPage = useBrowsePages({ ...quiet, searchParams: firstPublished });
  const firstMember = useBrowseMembers({
    ...quiet,
    searchParams: { ...first, order: 'created_at asc' },
  });
  const firstVisit = useTinybirdQuery({
    endpoint: 'api_first_visit',
    statsConfig,
    params: { site_uuid: statsConfig?.id || '' },
    enabled: Boolean(statsConfig?.id),
  });

  const isLoading =
    firstPost.isLoading || firstPage.isLoading || firstMember.isLoading || firstVisit.loading;

  const start = useMemo(() => {
    const visit = (firstVisit.data?.[0] as { first_visit?: string | null } | undefined)
      ?.first_visit;
    const dates = [
      firstPost.data?.posts?.[0]?.published_at,
      firstPage.data?.pages?.[0]?.published_at,
      firstMember.data?.members?.[0]?.created_at,
      // Tinybird answers in UTC without a zone marker
      visit ? `${visit.replace(' ', 'T')}Z` : null,
    ]
      .filter((date): date is string => Boolean(date))
      .map((date) => moment(date));
    if (dates.length === 0) {
      return null;
    }
    return formatQueryDate(moment.min(dates));
  }, [firstPost.data, firstPage.data, firstMember.data, firstVisit.data]);

  // Set before the views below work out their ranges
  if (!isLoading) {
    setAllTimeStart(start);
  }

  return { isLoading };
};
