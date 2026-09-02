import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { getRecipientType } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  publishBackToDashboard,
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
  onRevertToDraft?: () => void;
}

function RevertToDraft({ onRevertToDraft }: { onRevertToDraft?: () => void }) {
  if (!onRevertToDraft) {
    return null;
  }

  return (
    <Text>
      Need to make a change?{' '}
      <Button
        className="h-auto p-0"
        data-testid={publishRevertToDraft}
        variant="link"
        onClick={onRevertToDraft}
      >
        Unschedule and revert to draft &rarr;
      </Button>
    </Text>
  );
}

export function CompleteStep({
  post,
  state,
  captured,
  timezone,
  siteTitle,
  postCount,
  onRevertToDraft,
}: CompleteStepProps) {
  const { count } = useMembersCount(state.fullRecipientFilter);
  const emailOnly = captured.willOnlyEmail;
  const publishedAt = captured.isScheduled
    ? state.scheduledAt
    : (post.publishedAt ?? state.scheduledAt);

  const deliveryVerb = emailOnly ? 'sent' : captured.willEmail ? 'published and sent' : 'published';

  return (
    <Stack data-testid={publishFlowComplete} gap="xl">
      <Text as="h2" size="3xl" weight="bold">
        {captured.isScheduled ? (
          <>
            <span className="text-state-success">All set!</span> Your{' '}
            {emailOnly ? 'email' : post.displayName} will be {deliveryVerb}{' '}
            {formatScheduledCompletion(publishedAt, timezone)}.
          </>
        ) : (
          <>
            <span className="text-state-success">Boom. It’s out there.</span>{' '}
            {emailOnly ? (
              'Your email has been sent.'
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
        <Stack gap="md">
          <Text>
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
          {captured.isScheduled ? <RevertToDraft onRevertToDraft={onRevertToDraft} /> : null}
        </Stack>
      ) : (
        <Stack gap="md">
          <PostBookmark post={post} siteTitle={siteTitle} />
          {captured.isScheduled ? (
            <RevertToDraft onRevertToDraft={onRevertToDraft} />
          ) : (
            <Text>
              <a className="underline" data-testid={publishBackToDashboard} href="#/analytics">
                Back to dashboard
              </a>
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
