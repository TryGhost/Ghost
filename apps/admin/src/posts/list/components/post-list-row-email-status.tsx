import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { getEmailSendingProgressCopy } from '@/posts/email-sending-status/email-sending-status-copy';
import { useEmailSendingStatusPolling } from '@/posts/email-sending-status/use-email-sending-status';
import { useSendingEta } from '@/posts/email-sending-status/use-sending-eta';
import type { PostListItem } from '@/posts/list/hooks/use-posts-list';
import {
  SETTLED_POST_LIST_ROW_EMAIL_STATUS,
  type PostListRowEmailStatusState,
} from '@/posts/list/components/post-list-row-email-status-state';

interface PostListRowEmailStatusProps {
  post: PostListItem;
  children: (state: PostListRowEmailStatusState) => ReactNode;
}

/**
 * Owns the live query for one in-progress row. Settled rows never mount this
 * component, keeping their memo boundary independent of polling updates.
 */
export function PostListRowEmailStatus({ post, children }: PostListRowEmailStatusProps) {
  const queryClient = useQueryClient();
  const emailId = post.email?.id;
  const emailStatus = post.email?.status;
  const query = useEmailSendingStatusPolling({ emailId, emailStatus, enabled: true });
  const status = query.status;
  const sending = status?.sending;
  const sendingStatus = sending?.status;
  const estimate = useSendingEta(status);
  const [refreshedSubmittedEmailId, setRefreshedSubmittedEmailId] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId || !sendingStatus) {
      return;
    }

    if (sendingStatus !== 'submitted') {
      setRefreshedSubmittedEmailId((currentEmailId) =>
        currentEmailId === emailId ? null : currentEmailId,
      );
    }

    if (sendingStatus === 'failed') {
      void queryClient.invalidateQueries({ queryKey: [postsDataType] });
      return;
    }

    if (sendingStatus === 'submitted') {
      let cancelled = false;
      void queryClient.invalidateQueries({ queryKey: [postsDataType] }).then(() => {
        if (!cancelled) {
          setRefreshedSubmittedEmailId(emailId);
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [emailId, queryClient, sendingStatus]);

  if (query.isUnsupported) {
    return <>{children(SETTLED_POST_LIST_ROW_EMAIL_STATUS)}</>;
  }

  if (sending?.status === 'failed') {
    return <>{children({ status: 'failed' })}</>;
  }

  const isRefreshingSubmittedData = Boolean(
    emailId && sending?.status === 'submitted' && refreshedSubmittedEmailId !== emailId,
  );

  if (sending && (sending.status !== 'submitted' || isRefreshingSubmittedData)) {
    return (
      <>
        {children({
          status: 'sending',
          copy: getEmailSendingProgressCopy(sending, estimate),
        })}
      </>
    );
  }

  if (!sending && (emailStatus === 'pending' || emailStatus === 'submitting')) {
    return (
      <>
        {children({
          status: 'sending',
          copy: {
            title: emailStatus === 'pending' ? 'Preparing emails' : 'Sending emails',
            detail: null,
          },
        })}
      </>
    );
  }

  return <>{children(SETTLED_POST_LIST_ROW_EMAIL_STATUS)}</>;
}
