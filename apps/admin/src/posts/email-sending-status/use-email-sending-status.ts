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
    enabled: (currentQuery) => {
      const queriedStatus = currentQuery.state.data?.email_statuses[0]?.sending.status;
      const missingBackend =
        !currentQuery.state.data &&
        currentQuery.state.error instanceof APIError &&
        currentQuery.state.error.response?.status === 404;
      const submittedBeforeStatusLoaded = !currentQuery.state.data && emailStatus === 'submitted';

      return (
        shouldQuery &&
        !missingBackend &&
        !submittedBeforeStatusLoaded &&
        queriedStatus !== 'submitted'
      );
    },
    defaultErrorHandler: false,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.email_statuses[0]?.sending.status;
      return status === 'preparing' || status === 'submitting' ? STATUS_POLL_INTERVAL : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const data = query.data;
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
    isLoading: query.isLoading,
    isUnsupported,
    refetch,
  };
}
