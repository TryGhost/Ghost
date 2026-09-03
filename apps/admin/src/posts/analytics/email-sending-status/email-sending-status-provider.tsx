import { EmailSendingStatusContext } from './email-sending-status-context';
import { hasBeenEmailed } from '@tryghost/admin-x-framework';
import { linksDataType } from '@tryghost/admin-x-framework/api/links';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import {
  newsletterBasicStatsDataType,
  newsletterClickStatsDataType,
} from '@tryghost/admin-x-framework/api/stats';
import {
  useBrowseEmailBatches,
  useEmailSendingStatus,
  useRetryEmail,
} from '@tryghost/admin-x-framework/api/emails';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFeatureFlag, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_POLL_INTERVAL = 2000;
const NEWSLETTER_DATA_TYPES = new Set([
  postsDataType,
  linksDataType,
  newsletterBasicStatsDataType,
  newsletterClickStatsDataType,
]);

const EmailSendingStatusProvider = ({ children }: { children: ReactNode }) => {
  const { post, refetchPost } = usePostAnalytics();
  const queryClient = useQueryClient();
  const enabled = useFeatureFlag('improveSendingUI');
  const emailId = post?.email?.id;
  const emailStatus = post?.email?.status;
  const shouldQuery =
    enabled && Boolean(emailId) && Boolean(emailStatus) && emailStatus !== 'submitted';

  const statusQuery = useEmailSendingStatus(emailId ?? '', {
    enabled: (query) => {
      const queriedStatus = query.state.data?.email_statuses[0]?.sending.status;
      const hasInitialError = query.state.status === 'error' && !query.state.data;
      return shouldQuery && !hasInitialError && queriedStatus !== 'submitted';
    },
    defaultErrorHandler: false,
    refetchInterval: (query) => {
      const status = query.state.data?.email_statuses[0]?.sending.status;
      return status === 'preparing' || status === 'submitting' ? STATUS_POLL_INTERVAL : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const { mutateAsync: retryEmail, isPending: isRetrying } = useRetryEmail();
  const { refetch: refetchStatus } = statusQuery;
  const handleError = useHandleError();

  const status = statusQuery.data?.email_statuses[0];
  const sendingStatus = status?.sending.status;
  const shouldQueryBatches = Boolean(enabled && emailId && sendingStatus === 'failed');
  const batchesQuery = useBrowseEmailBatches(emailId ?? '', {
    enabled: shouldQueryBatches,
    searchParams: { filter: 'status:submitting', fields: 'id,status', limit: '1' },
    defaultErrorHandler: false,
    retry: false,
  });
  const hasUnknownDeliveryOutcome = Boolean(
    shouldQueryBatches &&
    (batchesQuery.isFetching ||
      batchesQuery.isError ||
      !batchesQuery.data ||
      batchesQuery.data.batches.some((batch) => batch.status === 'submitting')),
  );
  const lastHandledSendingState = useRef<string | null>(null);
  const [refreshedSubmittedEmailId, setRefreshedSubmittedEmailId] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId || !sendingStatus) {
      return;
    }

    const sendingStateKey = `${emailId}:${sendingStatus}`;
    if (lastHandledSendingState.current === sendingStateKey) {
      return;
    }
    lastHandledSendingState.current = sendingStateKey;

    if (sendingStatus !== 'submitted') {
      setRefreshedSubmittedEmailId((currentEmailId) =>
        currentEmailId === emailId ? null : currentEmailId,
      );
    }

    if (sendingStatus === 'failed') {
      void refetchPost();
      return;
    }

    if (sendingStatus === 'submitted') {
      void queryClient
        .refetchQueries({
          type: 'active',
          predicate: (query) => {
            const dataType = query.queryKey[0];
            return typeof dataType === 'string' && NEWSLETTER_DATA_TYPES.has(dataType);
          },
        })
        .then(() => setRefreshedSubmittedEmailId(emailId));
    }
  }, [emailId, queryClient, refetchPost, sendingStatus]);

  const hasInitialError = statusQuery.isError && !statusQuery.data;
  const isStatusLoading = shouldQuery && statusQuery.isLoading && !status;
  const isRefreshingSubmittedData = Boolean(
    emailId && sendingStatus === 'submitted' && refreshedSubmittedEmailId !== emailId,
  );
  const isNewsletterDataHidden = Boolean(
    enabled &&
    !hasInitialError &&
    status &&
    (status.sending.status !== 'submitted' || isRefreshingSubmittedData),
  );
  const newsletterDataHiddenReason: 'sending' | 'failed' | null = isNewsletterDataHidden
    ? status?.sending.status === 'failed'
      ? 'failed'
      : 'sending'
    : null;
  const hasNewsletterAnalytics = Boolean(
    post && (hasBeenEmailed(post) || (enabled && !hasInitialError && status && post.email)),
  );

  const retrySending = useCallback(async () => {
    if (!emailId) {
      return;
    }

    try {
      await retryEmail(emailId);
      await refetchStatus();
    } catch (error) {
      handleError(error);
    }
  }, [emailId, handleError, refetchStatus, retryEmail]);

  const value = useMemo(
    () => ({
      enabled,
      status,
      isStatusLoading,
      isNewsletterDataHidden,
      newsletterDataHiddenReason,
      hasNewsletterAnalytics,
      hasUnknownDeliveryOutcome,
      isRetrying,
      retrySending,
    }),
    [
      enabled,
      status,
      isStatusLoading,
      isNewsletterDataHidden,
      newsletterDataHiddenReason,
      hasNewsletterAnalytics,
      hasUnknownDeliveryOutcome,
      isRetrying,
      retrySending,
    ],
  );

  return (
    <EmailSendingStatusContext.Provider value={value}>
      {children}
    </EmailSendingStatusContext.Provider>
  );
};

export default EmailSendingStatusProvider;
