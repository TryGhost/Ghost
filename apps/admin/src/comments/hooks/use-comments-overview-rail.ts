import { APIError } from '@tryghost/admin-x-framework/errors';
import { useCommentsOverview } from '@tryghost/admin-x-framework/api/stats';
import { useMemo } from 'react';

export function useCommentsOverviewRail(searchParams: {
  date_from: string;
  date_to: string;
  timezone: string;
}) {
  const { data, isLoading, error, isError, isFetching } = useCommentsOverview({
    searchParams,
    defaultErrorHandler: false,
    retry: (failureCount, queryError) => {
      if (queryError instanceof APIError && queryError.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const failed = isError && !isFetching;
  const missingBackend = failed && error instanceof APIError && error.response?.status === 404;

  return {
    data,
    isLoading,
    isError: failed && !missingBackend,
    showRail: !missingBackend,
  };
}

export function useCommentsOverviewSearchParams(
  dateFrom: string,
  dateTo: string,
  timezone: string,
) {
  return useMemo(
    () => ({
      date_from: dateFrom,
      date_to: dateTo,
      timezone,
    }),
    [dateFrom, dateTo, timezone],
  );
}
