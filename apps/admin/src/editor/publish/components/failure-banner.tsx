import { Banner } from '@tryghost/shade/components';
import { LimitMessage } from './limit-message';
import type { CompletionFailure } from '@/editor/publish/completion-message';

/** A failure's copy, with a host limit's upgrade phrase rendered as a link. */
export function FailureMessage({ failure }: { failure: CompletionFailure }) {
  if (!failure.parts) {
    return <>{failure.message}</>;
  }

  return <LimitMessage parts={failure.parts} />;
}

/** A failure in place: an error, or a neutral note when nothing actually failed. */
export function FailureBanner({
  failure,
  testId,
}: {
  failure: CompletionFailure;
  testId?: string;
}) {
  const info = failure.tone === 'info';

  return (
    <Banner
      data-testid={testId}
      role={info ? 'status' : 'alert'}
      variant={info ? 'info' : 'destructive'}
    >
      <FailureMessage failure={failure} />
    </Banner>
  );
}
