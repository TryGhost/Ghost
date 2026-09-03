import { EmailSendingStatusContext } from './email-sending-status-context';
import { hasBeenEmailed } from '@tryghost/admin-x-framework';
import { useEmailSendingStatus, useRetryEmail } from '@tryghost/admin-x-framework/api/emails';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFeatureFlag, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
const STATUS_POLL_INTERVAL = 2000;

const EmailSendingStatusProvider = ({ children }: { children: ReactNode }) => {
  const { post, refetchPost } = usePostAnalytics();
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
  const refreshedSubmittedEmailId = useRef<string | null>(null);

  useEffect(() => {
    if (
      !emailId ||
      status?.sending.status !== 'submitted' ||
      refreshedSubmittedEmailId.current === emailId
    ) {
      return;
    }

    refreshedSubmittedEmailId.current = emailId;
    void refetchPost();
  }, [emailId, refetchPost, status?.sending.status]);

  const hasInitialError = statusQuery.isError && !statusQuery.data;
  const isStatusLoading = shouldQuery && statusQuery.isLoading && !status;
  const isNewsletterDataHidden = Boolean(
    enabled && !hasInitialError && status && status.sending.status !== 'submitted',
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
