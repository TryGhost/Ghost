import { Banner, Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import {
  publishEmailErrorStep,
  publishRetryEmail,
  publishRetryError,
} from '@tryghost/test-data/selectors/editor';
import type { ConfirmStatus } from '@/editor/publish/use-publish-flow';
import type { PublishFlowPost } from '@/editor/publish/flow-post';

// A partially delivered send is only distinguishable by the word "partially"
// appearing in the error message the API stores on the email.
function isPartialEmailFailure(error: string): boolean {
  return error.includes('partially');
}

export interface CompleteWithEmailErrorStepProps {
  canRetry: boolean;
  post: PublishFlowPost;
  emailErrorMessage: string;
  willOnlyEmail: boolean;
  mailgunConfigured: boolean;
  status: ConfirmStatus;
  retryFailure: string | null;
  onRetry: () => void;
}

export function CompleteWithEmailErrorStep({
  canRetry,
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
      <Text as="h2" className="text-5xl leading-tighter tracking-tight" weight="bold">
        <span className="text-state-error block">Uh-oh.</span>{' '}
        {willOnlyEmail
          ? 'Your post has been created but the email failed to send.'
          : `Your ${post.displayName} has been published but the email failed to send.`}
      </Text>

      <Text className="text-pretty" size="lg">
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

      {canRetry && (
        <Inline>
          <Button
            className="h-auto min-h-11 max-w-full px-5 py-2 whitespace-normal"
            data-testid={publishRetryEmail}
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
        </Inline>
      )}
    </Stack>
  );
}
