import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { getRecipientType } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import {
  publishBackToDashboard,
  publishCompleteNote,
  publishFlowComplete,
  publishRevertToDraft,
} from '@tryghost/test-data/selectors/editor';
import { PostBookmark } from './post-bookmark';
import {
  formatScheduledCompletion,
  formatSiteDateTime,
  recipientsConfirmLabel,
} from '@/editor/publish/publish-copy';
import type { PublishFlowPost } from '@/editor/publish/flow-post';
import type { PublishOptionsState } from '@/editor/publish/publish-options';

export interface CompleteStepProps {
  post: PublishFlowPost;
  state: PublishOptionsState;
  captured: {
    willPublish: boolean;
    willEmail: boolean;
    willOnlyEmail: boolean;
    isScheduled: boolean;
  };
  timezone: string;
  siteTitle?: string;
  /** Published-post total including this one; null for pages, schedules and email-only. */
  postCount: number | null;
  /** When the publish landed, standing in for the publish time the server stamped. */
  completedAt: string | null;
  /** Shown when the publish landed but something after it could not be confirmed. */
  note?: string | null;
  onRevertToDraft?: () => void;
}

function RevertToDraft({ onRevertToDraft }: { onRevertToDraft?: () => void }) {
  if (!onRevertToDraft) {
    return null;
  }

  return (
    <Stack gap="md">
      <Text size="lg">Need to make a change?</Text>
      <Inline>
        <Button
          className="h-auto min-h-11 max-w-full px-5 py-2 whitespace-normal"
          data-testid={publishRevertToDraft}
          size="lg"
          variant="outline"
          onClick={onRevertToDraft}
        >
          Unschedule and revert to draft &rarr;
        </Button>
      </Inline>
    </Stack>
  );
}

export function CompleteStep({
  post,
  state,
  captured,
  timezone,
  siteTitle,
  postCount,
  completedAt,
  note,
  onRevertToDraft,
}: CompleteStepProps) {
  const { count } = useMembersCount(state.fullRecipientFilter, {
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const emailOnly = captured.willOnlyEmail;
  // A schedule publishes at the chosen time; anything else just published.
  const publishedAt = captured.isScheduled
    ? state.scheduledAt
    : (completedAt ?? post.publishedAt ?? state.scheduledAt);

  const deliveryVerb = emailOnly ? 'sent' : captured.willEmail ? 'published and sent' : 'published';
  // With a note the send is the unknown, so nothing here may claim one landed.
  const unconfirmed = Boolean(note);

  return (
    <Stack data-testid={publishFlowComplete} gap="xl">
      {note ? (
        <Banner data-testid={publishCompleteNote} role="status" variant="warning">
          {note}
        </Banner>
      ) : null}
      <Text as="h2" className="text-5xl leading-tighter tracking-tight" weight="bold">
        {captured.isScheduled ? (
          <>
            <span className="block text-state-success">All set!</span> Your{' '}
            {emailOnly ? 'email' : post.displayName} will be {deliveryVerb}{' '}
            {formatScheduledCompletion(publishedAt, timezone)}.
          </>
        ) : (
          <>
            {emailOnly && unconfirmed ? null : (
              <span className="block text-state-success">Boom. It’s out there. </span>
            )}
            {emailOnly ? (
              unconfirmed ? (
                <>Your {post.displayName} has been created.</>
              ) : (
                'Your email has been sent.'
              )
            ) : post.displayName === 'post' && postCount ? (
              <>
                That’s {formatNumber(postCount)} {postCount === 1 ? 'post' : 'posts'} published,
                keep going!
              </>
            ) : (
              <>Your {post.displayName} has been published.</>
            )}
          </>
        )}
      </Text>

      {emailOnly ? (
        <Stack gap="xl">
          {unconfirmed ? null : (
            <Text className="text-pretty" size="lg">
              Your post {captured.isScheduled ? 'will be' : 'was'} sent to{' '}
              <strong>
                {recipientsConfirmLabel({
                  recipientType: getRecipientType(state.recipientFilter),
                  count,
                })}
              </strong>
              {state.onlyDefaultNewsletter ? null : (
                <>
                  {' '}
                  of <strong>{state.newsletter?.name}</strong>
                </>
              )}{' '}
              on {formatSiteDateTime(publishedAt, timezone)}.
            </Text>
          )}
          {captured.isScheduled ? <RevertToDraft onRevertToDraft={onRevertToDraft} /> : null}
        </Stack>
      ) : (
        <Stack gap="xl">
          <PostBookmark post={post} siteTitle={siteTitle} />
          {captured.isScheduled ? (
            <RevertToDraft onRevertToDraft={onRevertToDraft} />
          ) : (
            <Inline>
              <Button className="px-5" size="lg" variant="outline" asChild>
                <a data-testid={publishBackToDashboard} href="#/analytics">
                  <LucideIcon.ArrowLeft />
                  Back to dashboard
                </a>
              </Button>
            </Inline>
          )}
        </Stack>
      )}
    </Stack>
  );
}
