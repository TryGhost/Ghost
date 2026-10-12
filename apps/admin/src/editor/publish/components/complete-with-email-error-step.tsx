import { Button } from '@tryghost/shade/components';
import { FailureBanner } from './failure-banner';
import {
  RETRY_ELIGIBILITY_FAILED_MESSAGE,
  type CompletionFailure,
} from '@/editor/publish/completion-message';
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
  retryFailure: CompletionFailure | null;
  /** Whether the email can be retried could not be read. */
  eligibilityFailed: boolean;
  checkingEligibility: boolean;
  onCheckEligibility: () => void;
  onRetry: () => void;
}

const ELIGIBILITY_FAILURE: CompletionFailure = { message: RETRY_ELIGIBILITY_FAILED_MESSAGE };

export function CompleteWithEmailErrorStep({
  canRetry,
  post,
  emailErrorMessage,
  willOnlyEmail,
  mailgunConfigured,
  status,
  retryFailure,
  eligibilityFailed,
  checkingEligibility,
  onCheckEligibility,
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

      {retryFailure ? <FailureBanner failure={retryFailure} testId={publishRetryError} /> : null}

      {eligibilityFailed ? (
        <Stack align="start" gap="md">
          <FailureBanner className="w-full" failure={ELIGIBILITY_FAILURE} />
          <Button
            disabled={checkingEligibility}
            size="lg"
            variant="destructive"
            onClick={onCheckEligibility}
          >
            {checkingEligibility ? 'Checking' : 'Check retry availability'}
          </Button>
        </Stack>
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
