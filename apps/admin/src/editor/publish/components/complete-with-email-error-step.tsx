import { Banner, Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { isPartialEmailFailure } from '@/editor/publish/email-confirmation';
import {
  publishEmailErrorStep,
  publishRetryEmailButton,
  publishRetryError,
} from '@tryghost/test-data/selectors/editor';
import type { ConfirmStatus } from '@/editor/publish/use-publish-flow';
import type { PublishFlowPost } from '@/editor/publish/flow-post';

export interface CompleteWithEmailErrorStepProps {
  post: PublishFlowPost;
  emailErrorMessage: string;
  willOnlyEmail: boolean;
  mailgunConfigured: boolean;
  status: ConfirmStatus;
  retryFailure: string | null;
  onRetry: () => void;
}

export function CompleteWithEmailErrorStep({
  post,
  emailErrorMessage,
  willOnlyEmail,
  mailgunConfigured,
  status,
  retryFailure,
  onRetry,
}: CompleteWithEmailErrorStepProps) {
  const partial = isPartialEmailFailure(emailErrorMessage);

  return (
    <Stack data-testid={publishEmailErrorStep} gap="xl">
      <Text as="h2" size="3xl" weight="bold">
        <span className="text-state-error">Uh-oh.</span>{' '}
        {willOnlyEmail
          ? 'Your post has been created but the email failed to send.'
          : `Your ${post.displayName} has been published but the email failed to send.`}
      </Text>

      <Text>
        {emailErrorMessage}
        {mailgunConfigured ? null : (
          <>
            <br />
            <br />
            If the error persists, please verify your email settings.
          </>
        )}
      </Text>

      {retryFailure ? (
        <Banner data-testid={publishRetryError} role="alert" variant="destructive">
          {retryFailure}
        </Banner>
      ) : null}

      <div>
        <Button
          data-testid={publishRetryEmailButton}
          disabled={status === 'running'}
          size="lg"
          variant="destructive"
          onClick={onRetry}
        >
          {status === 'running'
            ? 'Sending'
            : partial
              ? 'Send remaining emails'
              : 'Retry sending email'}
        </Button>
      </div>
    </Stack>
  );
}
