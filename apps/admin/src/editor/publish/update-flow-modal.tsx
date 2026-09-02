import { Banner, Button, Dialog, DialogContent, DialogTitle } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { useMemo, useRef, useState } from 'react';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  publishRevertToDraft,
  updateFlowConfirmation,
  updateFlowModal,
  updateFlowPreviousEmail,
  updateFlowTitle,
} from '@tryghost/test-data/selectors/editor';
import { createPublishOptions } from './publish-options';
import { describeCompletionFailure, type CompletionFailure } from './completion-message';
import { formatSiteDateTime } from './publish-copy';
import type { PublishDispatcher } from './use-publish-flow';
import type { PublishFlowPost } from './flow-post';
import type { PublishSiteInput, PublishUserInput } from './publish-options';

const FULLSCREEN =
  'top-0 left-0 h-[100dvh] w-full max-w-full translate-0 grid-rows-[1fr] gap-0 overflow-y-auto rounded-none border-0 p-0 shadow-none sm:rounded-none';

export interface UpdateFlowModalProps {
  post: PublishFlowPost;
  site: PublishSiteInput;
  user: PublishUserInput;
  timezone: string;
  dispatch: PublishDispatcher;
  onClose: () => void;
  /** Called after the revert lands, so the caller can leave or refresh. */
  onReverted?: () => void;
}

function pluralSubscribers(count: number | null | undefined): string {
  if (count === null || count === undefined) {
    return 'subscribers';
  }
  return `${formatNumber(count)} ${count === 1 ? 'subscriber' : 'subscribers'}`;
}

export function UpdateFlowModal({
  post,
  site,
  user,
  timezone,
  dispatch,
  onClose,
  onReverted,
}: UpdateFlowModalProps) {
  // Read once, like the publish flow's machine: keyed on the post, not on prop identity.
  const inputs = useRef({ post, site, user });
  inputs.current = { post, site, user };

  const machine = useMemo(() => {
    const current = inputs.current;

    return createPublishOptions({
      post: { ...current.post, isPage: current.post.displayName === 'page' },
      site: current.site,
      user: current.user,
    });
  }, [post.id]);
  const state = machine.getState();
  const { count } = useMembersCount(state.fullRecipientFilter);
  const [failure, setFailure] = useState<CompletionFailure | null>(null);
  const [running, setRunning] = useState(false);

  const isScheduled = post.status === 'scheduled';
  const emailOnly = post.status === 'sent';
  const hasBeenEmailed = Boolean(post.email);
  // The post's own newsletter, not the picker's: a send to a since-archived
  // newsletter must still be named, or it reads as a send to the default one.
  const showNewsletterName = !state.onlyDefaultNewsletter || post.newsletterStatus === 'archived';

  const revert = async () => {
    setFailure(null);
    setRunning(true);

    const completion = await dispatch(machine.toRevertDispatch());
    const completionFailure = describeCompletionFailure(completion);

    setRunning(false);

    if (completionFailure) {
      setFailure(completionFailure);
      return;
    }

    onReverted?.();
    onClose();
  };

  const publishedAt = post.publishedAt;

  return (
    <Dialog modal={false} open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={FULLSCREEN}
        data-testid={updateFlowModal}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">{isScheduled ? 'Unschedule' : 'Unpublish'}</DialogTitle>
        <Stack className="mx-auto w-full max-w-2xl px-6 pb-16" gap="xl">
          <Inline className="py-4" justify="end">
            {emailOnly ? null : (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </Inline>

          <Text as="h2" data-testid={updateFlowTitle} size="3xl" weight="bold">
            This {post.displayName} {emailOnly ? 'was' : 'has been'}{' '}
            <span className="text-state-success">
              {post.status}
              {emailOnly ? ' by email' : ''}
            </span>
          </Text>

          <Text data-testid={updateFlowConfirmation}>
            Your {post.displayName} {isScheduled ? 'will be' : 'was'}{' '}
            {hasBeenEmailed || state.willEmail ? (
              <>
                {emailOnly ? 'sent to' : 'published and sent to'}{' '}
                <strong>
                  {isScheduled
                    ? pluralSubscribers(count)
                    : pluralSubscribers(post.email?.email_count ?? null)}
                </strong>
                {showNewsletterName && post.newsletterName ? (
                  <>
                    {' '}
                    of <strong>{post.newsletterName}</strong>
                  </>
                ) : null}
              </>
            ) : (
              'published on your site'
            )}
            {publishedAt ? <> on {formatSiteDateTime(publishedAt, timezone)}.</> : '.'}
          </Text>

          {isScheduled && post.email ? (
            <Text data-testid={updateFlowPreviousEmail}>
              This post was previously emailed to{' '}
              <strong>{pluralSubscribers(post.email.email_count ?? null)}</strong>
              {showNewsletterName && post.newsletterName ? (
                <>
                  {' '}
                  of <strong>{post.newsletterName}</strong>
                </>
              ) : null}
              {post.emailCreatedAt ? (
                <> on {formatSiteDateTime(post.emailCreatedAt, timezone)}.</>
              ) : (
                '.'
              )}
            </Text>
          ) : null}

          {failure ? (
            <Banner role="alert" variant="destructive">
              {failure.message}
            </Banner>
          ) : null}

          {isScheduled || !emailOnly ? (
            <div>
              <Button
                data-testid={publishRevertToDraft}
                disabled={running}
                size="lg"
                variant="outline"
                onClick={() => void revert()}
              >
                {isScheduled
                  ? 'Unschedule and revert to draft →'
                  : 'Unpublish and revert to private draft →'}
              </Button>
            </div>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
