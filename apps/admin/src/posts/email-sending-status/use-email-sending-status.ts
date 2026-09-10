import { APIError } from '@tryghost/admin-x-framework/errors';
import { useEmailSendingStatus } from '@tryghost/admin-x-framework/api/emails';
import { useCallback } from 'react';
import type { EmailSendingStatus } from '@tryghost/admin-x-framework/api/emails';

const STATUS_POLL_INTERVAL = import.meta.env.MODE === 'test' ? 50 : 2000;

interface UseEmailSendingStatusPollingOptions {
  emailId?: string | null;
  emailStatus?: string | null;
  enabled: boolean;
}

interface EmailSendingStatusPollingResult {
  status: EmailSendingStatus | undefined;
  isLoading: boolean;
  isUnsupported: boolean;
  refetch: (options?: { throwOnError?: boolean }) => Promise<void>;
}

/**
 * The polling and older-backend compatibility contract shared by every Admin
 * surface that reports an email send in progress.
 */
export function useEmailSendingStatusPolling({
  emailId,
  emailStatus,
  enabled,
}: UseEmailSendingStatusPollingOptions): EmailSendingStatusPollingResult {
  const shouldQuery = enabled && Boolean(emailId) && Boolean(emailStatus);
  const query = useEmailSendingStatus(emailId ?? '', {
    // The post's terminal state needs no status check. For every other state,
    // refresh on entry, even if a previous screen cached a failure or completion.
    enabled: shouldQuery && emailStatus !== 'submitted',
    staleTime: 0,
    defaultErrorHandler: false,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.email_statuses[0]?.sending.status;
      return status === 'preparing' || status === 'submitting' ? STATUS_POLL_INTERVAL : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
  // Cached results must not drive banners or completion/failure effects before
  // this screen's request succeeds (including when that request fails).
  const data = query.isFetchedAfterMount && !query.isError ? query.data : undefined;
  const isUnsupported =
    !data && query.error instanceof APIError && query.error.response?.status === 404;
  const { refetch: refetchQuery } = query;
  const refetch = useCallback(
    async (options?: { throwOnError?: boolean }) => {
      await refetchQuery(options);
    },
    [refetchQuery],
  );

  return {
    status: data?.email_statuses[0],
    isLoading: query.isLoading || (!data && query.isFetching),
    isUnsupported,
    refetch,
  };
}
