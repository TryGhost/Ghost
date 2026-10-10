import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { escapeNqlString } from '@tryghost/nql-string';
import useHandleError from '../hooks/use-handle-error';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';
import { loadMemberActivityPage, type MemberActivityCursor } from './member-activity-pagination';
import type { MemberActivityFeedResponseType } from './members';

export interface BrowseMemberActivityOptions {
  memberId?: string;
  excludedEvents?: string[];
  limit?: number;
  enabled?: boolean;
  defaultErrorHandler?: boolean;
}

/** Full, paginated activity feed. The member detail preview keeps its five-row query. */
export function useBrowseMemberActivityFeed({
  memberId,
  excludedEvents = [],
  limit = 50,
  enabled = true,
  defaultErrorHandler = true,
}: BrowseMemberActivityOptions = {}) {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();
  // Accept the Activity page's domain filters, not arbitrary NQL. Core splits
  // type selectors from row filters, so root-OR expressions cannot safely be
  // combined with a timestamp or per-type pagination cursor.
  const baseFilter = [
    excludedEvents.length && `type:-[${excludedEvents.map(escapeNqlString).join(',')}]`,
    memberId && `data.member_id:${escapeNqlString(memberId)}`,
  ]
    .filter(Boolean)
    .join('+');
  const result = useInfiniteQuery({
    queryKey: [
      'MemberActivityFeedResponseType',
      apiUrl('/members/events/', { filter: baseFilter, limit: String(limit) }),
      'timeline',
    ],
    enabled,
    initialPageParam: { kind: 'older' } as MemberActivityCursor,
    queryFn: ({ pageParam, signal }) =>
      loadMemberActivityPage({
        read: (params) =>
          fetchApi<MemberActivityFeedResponseType>(apiUrl('/members/events/', params)),
        filter: baseFilter,
        limit,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (page) => page.nextCursor,
  });
  const data = useMemo(
    () =>
      result.data && {
        events: result.data.pages.flatMap((page) => page.events),
        meta: result.data.pages[0]?.meta,
        isEnd: !result.data.pages[result.data.pages.length - 1]?.nextCursor,
      },
    [result.data],
  );

  useEffect(() => {
    if (result.error && defaultErrorHandler) {
      handleError(result.error);
    }
  }, [result.error, handleError, defaultErrorHandler]);

  return { ...result, data };
}
