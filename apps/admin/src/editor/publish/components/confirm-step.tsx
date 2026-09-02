import { Banner, Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { getRecipientType } from '@tryghost/admin-x-framework/utils/recipient-filter';
import { upgradeRoute } from '@tryghost/admin-x-framework/api/config';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useMembersCount } from '@tryghost/admin-x-framework/api/members';
import {
  publishBackToSettings,
  publishConfirmButton,
  publishConfirmError,
  publishFlowConfirm,
} from '@tryghost/test-data/selectors/editor';
import {
  confirmButtonText,
  confirmPublishType,
  confirmRunningText,
  confirmSuccessText,
  formatSiteDateTime,
  recipientsConfirmLabel,
} from '@/editor/publish/publish-copy';
import type { CompletionFailure } from '@/editor/publish/completion-message';
import type { ConfirmStatus } from '@/editor/publish/use-publish-flow';
import type { PublishFlowPost } from '@/editor/publish/flow-post';
import type { PublishOptionsState } from '@/editor/publish/publish-options';

export interface ConfirmStepProps {
  post: PublishFlowPost;
  state: PublishOptionsState;
  /** Captured on entering this step so saving cannot change the copy. */
  captured: { willPublish: boolean; willEmail: boolean; willOnlyEmail: boolean };
  timezone: string;
  status: ConfirmStatus;
  failure: CompletionFailure | null;
  onConfirm: () => void;
  onBack: () => void;
}

function FailureMessage({ failure }: { failure: CompletionFailure }) {
  const { data: configData } = useBrowseConfig();

  if (!failure.parts) {
    return <>{failure.message}</>;
  }

  const route = upgradeRoute(configData?.config);

  return (
    <>
      {failure.parts.map((part) =>
        part.kind === 'upgrade' ? (
          <a key={`${part.kind}:${part.text}`} className="underline" href={`#${route}`}>
            {part.text}
          </a>
        ) : (
          <span key={`${part.kind}:${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function ConfirmStep({
  post,
  state,
  captured,
  timezone,
  status,
  failure,
  onConfirm,
  onBack,
}: ConfirmStepProps) {
  const { count } = useMembersCount(state.fullRecipientFilter);
  const publishType = confirmPublishType(captured);
  const showNewsletterName = !state.onlyDefaultNewsletter && state.newsletter?.name;
  const recipients = recipientsConfirmLabel({
    recipientType: getRecipientType(state.recipientFilter),
    count,
  });

  const buttonText = {
    idle: confirmButtonText({
      publishType,
      isScheduled: state.isScheduled,
      scheduledAt: state.scheduledAt,
      displayName: post.displayName,
      timezone,
    }),
    running: confirmRunningText(publishType, state.isScheduled),
    success: confirmSuccessText(publishType, state.isScheduled),
  };

  return (
    <Stack data-testid={publishFlowConfirm} gap="xl">
      <Stack gap="none">
        <Text as="h2" className="text-state-success" size="3xl" weight="bold">
          Ready, set, publish.
        </Text>
        <Text size="3xl" weight="bold">
          Share it with the world.
        </Text>
      </Stack>

      <Text>
        {state.isScheduled ? (
          <>
            On <strong>{formatSiteDateTime(state.scheduledAt, timezone)}</strong> your
          </>
        ) : (
          'Your'
        )}{' '}
        {post.displayName}
        {captured.willPublish ? (
          <> will be published on your site{captured.willEmail ? ', and delivered to' : '.'}</>
        ) : null}
        {captured.willEmail ? (
          <>
            {captured.willPublish ? ' ' : ' will be delivered to '}
            <strong>{recipients}</strong>
            {showNewsletterName ? (
              <>
                {' '}
                of <strong>{state.newsletter?.name}</strong>
              </>
            ) : null}
            {captured.willPublish ? '.' : ','}
            {captured.willPublish ? null : (
              <>
                {' '}
                and will <strong>not</strong> be published on your site.
              </>
            )}
          </>
        ) : null}
      </Text>

      {failure ? (
        <Banner data-testid={publishConfirmError} role="alert" variant="destructive">
          <FailureMessage failure={failure} />
        </Banner>
      ) : null}

      <Stack align="start" gap="sm">
        <Button
          data-testid={publishConfirmButton}
          disabled={status === 'running'}
          size="lg"
          onClick={onConfirm}
        >
          {status === 'running'
            ? buttonText.running
            : status === 'success'
              ? buttonText.success
              : buttonText.idle}
        </Button>
        <Button data-testid={publishBackToSettings} size="lg" variant="link" onClick={onBack}>
          Back to settings
        </Button>
      </Stack>
    </Stack>
  );
}
