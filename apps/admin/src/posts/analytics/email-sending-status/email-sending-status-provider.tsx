import { EmailSendingStatusContext } from './email-sending-status-context';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { feedbackDataType } from '@tryghost/admin-x-framework/api/feedback';
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

const STATUS_POLL_INTERVAL = import.meta.env.MODE === 'test' ? 50 : 2000;
const NEWSLETTER_DATA_TYPES = new Set([
  postsDataType,
  linksDataType,
  newsletterBasicStatsDataType,
  newsletterClickStatsDataType,
  feedbackDataType,
]);

const EmailSendingStatusProvider = ({ children }: { children: ReactNode }) => {
  const { post, refetchPost } = usePostAnalytics();
  const queryClient = useQueryClient();
  const enabled = useFeatureFlag('improveSendingUI');
  const emailId = post?.email?.id;
  const emailStatus = post?.email?.status;
  const hasPublishedEmail =
    Boolean(emailId) && (post?.status === 'published' || post?.status === 'sent');
  const shouldQuery = enabled && hasPublishedEmail && Boolean(emailStatus);

  const statusQuery = useEmailSendingStatus(emailId ?? '', {
    enabled: (query) => {
      const queriedStatus = query.state.data?.email_statuses[0]?.sending.status;
      const missingBackend =
        !query.state.data &&
        query.state.error instanceof APIError &&
        query.state.error.response?.status === 404;
      const submittedBeforeStatusLoaded = !query.state.data && emailStatus === 'submitted';
      return (
        shouldQuery &&
        !missingBackend &&
        !submittedBeforeStatusLoaded &&
        queriedStatus !== 'submitted'
      );
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
  const { mutateAsync: retryEmail, isPending: isRetryMutationPending } = useRetryEmail();
  const { refetch: refetchStatus } = statusQuery;
  const handleError = useHandleError();
  const [isRetryRefreshPending, setIsRetryRefreshPending] = useState(false);

  const status = statusQuery.data?.email_statuses[0];
  const sendingStatus = status?.sending.status;
  const shouldQueryBatches = Boolean(enabled && emailId && sendingStatus === 'failed');
  const batchesQuery = useBrowseEmailBatches(emailId ?? '', {
    enabled: shouldQueryBatches,
    searchParams: { filter: 'status:submitting', fields: 'id,status', limit: '1' },
    defaultErrorHandler: false,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 0,
  });
  const hasUnknownDeliveryOutcome = Boolean(
    shouldQueryBatches &&
    (batchesQuery.isFetching ||
      batchesQuery.isError ||
      !batchesQuery.data ||
      batchesQuery.data.batches.some((batch) => batch.status === 'submitting')),
  );
  const lastHandledSendingState = useRef<string | null>(null);
  const retryInFlight = useRef(false);
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
      void Promise.all(
        [...NEWSLETTER_DATA_TYPES].map((dataType) =>
          queryClient.invalidateQueries({ queryKey: [dataType] }),
        ),
      ).then(() => setRefreshedSubmittedEmailId(emailId));
    }
  }, [emailId, queryClient, refetchPost, sendingStatus]);

  const isStatusLoading = shouldQuery && statusQuery.isLoading && !status;
  const isRefreshingSubmittedData = Boolean(
    emailId && sendingStatus === 'submitted' && refreshedSubmittedEmailId !== emailId,
  );
  const isNewsletterDataHidden = Boolean(
    enabled && status && (status.sending.status !== 'submitted' || isRefreshingSubmittedData),
  );
  const newsletterDataHiddenReason: 'sending' | 'failed' | null = isNewsletterDataHidden
    ? status?.sending.status === 'failed'
      ? 'failed'
      : 'sending'
    : null;
  const hasNewsletterAnalytics = Boolean(
    post &&
    (post.status === 'published' || post.status === 'sent') &&
    (hasBeenEmailed(post) || (enabled && status && post.email)),
  );

  const retrySending = useCallback(async () => {
    if (!emailId || retryInFlight.current) {
      return;
    }

    retryInFlight.current = true;
    setIsRetryRefreshPending(true);
    try {
      await retryEmail(emailId);
      await refetchStatus({ throwOnError: true });
    } catch (error) {
      handleError(error);
    } finally {
      retryInFlight.current = false;
      setIsRetryRefreshPending(false);
    }
  }, [emailId, handleError, refetchStatus, retryEmail]);

  const isRetrying = isRetryMutationPending || isRetryRefreshPending;

  const value = useMemo(
    () => ({
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
