import { Button, Dialog, DialogContent, DialogTitle } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';
import { useState } from 'react';
import {
  publicPreviewWarningDialog,
  publishFlowModal,
  publishFlowPreviewButton,
  tkReminderDialog,
} from '@tryghost/test-data/selectors/editor';
import { CompleteStep } from './components/complete-step';
import { CompleteWithEmailErrorStep } from './components/complete-with-email-error-step';
import { ConfirmStep } from './components/confirm-step';
import { GateDialog } from './components/gate-dialog';
import { OptionsStep } from './components/options-step';
import { PUBLIC_PREVIEW_WARNING_COPY, getPublicPreviewWarning } from './public-preview-warning';
import { usePublishFlow, type PublishDispatcher } from './use-publish-flow';
import type { PublishFlowPost } from './flow-post';
import type { PublishLimitPorts, PublishSiteInput, PublishUserInput } from './publish-options';

// A fullscreen surface: the flow owns the screen, like Ember's total overlay.
const FULLSCREEN =
  'top-0 left-0 h-[100dvh] w-full max-w-full translate-0 grid-rows-[1fr] gap-0 overflow-y-auto rounded-none border-0 p-0 shadow-none sm:rounded-none';

export interface PublishFlowModalProps {
  post: PublishFlowPost;
  site: PublishSiteInput;
  user: PublishUserInput;
  limits?: PublishLimitPorts;
  /** The publish machine's clock, injected for tests. */
  now?: () => Date;
  timezone: string;
  siteTitle?: string;
  /** Gates the flow behind a reminder when the body still has TK markers. */
  tkCount?: number;
  /** The `paywallImprovements` lab; the public-preview gate is off without it. */
  paywallImprovements?: boolean;
  /** The caller supplies the save engine's dispatch. */
  dispatch: PublishDispatcher;
  onBeforePublish?: () => Promise<void>;
  onClose: () => void;
  onPreview?: () => void;
  onRevertToDraft?: () => void;
  onCompleted?: (info: { postId: string; isScheduled: boolean; hasEmail: boolean }) => void;
}

export function PublishFlowModal({ post, ...props }: PublishFlowModalProps) {
  return <KeyedPublishFlowModal key={post.id} post={post} {...props} />;
}

/** A post change is a new journey; no gate, failure, or completion state carries across it. */
function KeyedPublishFlowModal({
  post,
  site,
  user,
  limits,
  now,
  timezone,
  siteTitle,
  tkCount = 0,
  paywallImprovements = false,
  dispatch,
  onBeforePublish,
  onClose,
  onPreview,
  onRevertToDraft,
  onCompleted,
}: PublishFlowModalProps) {
  const [gatesPassed, setGatesPassed] = useState(false);
  const previewWarning = paywallImprovements ? getPublicPreviewWarning(post) : null;

  // Ember checks the TK gate first and only reaches the preview warning when
  // there are no TKs, so the two never stack.
  if (!gatesPassed && tkCount > 0) {
    return (
      <GateDialog
        testId={tkReminderDialog}
        title="Forget something?"
        onBack={onClose}
        onContinue={() => setGatesPassed(true)}
      >
        Looks like you’ve got some unfinished business. There {tkCount === 1 ? 'is' : 'are'}{' '}
        <strong>
          {formatNumber(tkCount)} TK {tkCount === 1 ? 'reminder' : 'reminders'}
        </strong>{' '}
        left in your post.
      </GateDialog>
    );
  }

  if (!gatesPassed && previewWarning) {
    return (
      <GateDialog
        testId={publicPreviewWarningDialog}
        title={PUBLIC_PREVIEW_WARNING_COPY[previewWarning].title}
        onBack={onClose}
        onContinue={() => setGatesPassed(true)}
      >
        {PUBLIC_PREVIEW_WARNING_COPY[previewWarning].body}
      </GateDialog>
    );
  }

  return (
    <PublishFlowDialog
      dispatch={dispatch}
      limits={limits}
      now={now}
      post={post}
      site={site}
      siteTitle={siteTitle}
      timezone={timezone}
      user={user}
      onBeforePublish={onBeforePublish}
      onClose={onClose}
      onCompleted={onCompleted}
      onPreview={onPreview}
      onRevertToDraft={onRevertToDraft}
    />
  );
}

type PublishFlowDialogProps = Omit<PublishFlowModalProps, 'tkCount' | 'paywallImprovements'>;

function PublishFlowDialog({
  post,
  site,
  user,
  limits,
  now,
  timezone,
  siteTitle,
  dispatch,
  onBeforePublish,
  onClose,
  onPreview,
  onRevertToDraft,
  onCompleted,
}: PublishFlowDialogProps) {
  const flow = usePublishFlow({
    post,
    site,
    user,
    limits,
    now,
    dispatch,
    onBeforePublish,
    onCompleted,
  });
  const { machine, state, step } = flow;
  const close = () => {
    flow.cancel();
    onClose();
  };

  const transition =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value);
      flow.refresh();
    };

  return (
    <Dialog modal={false} open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className={FULLSCREEN}
        data-testid={publishFlowModal}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Publish</DialogTitle>
        <Stack className="mx-auto w-full max-w-2xl px-6 pb-16" gap="xl">
          <Inline className="py-4" justify="end">
            {step === 'complete' ? null : (
              <>
                <Button variant="outline" onClick={close}>
                  Close
                </Button>
                {flow.emailErrorMessage || !onPreview ? null : (
                  <Button
                    data-testid={publishFlowPreviewButton}
                    variant="outline"
                    onClick={onPreview}
                  >
                    Preview
                  </Button>
                )}
              </>
            )}
          </Inline>

          {step === 'email-error' && flow.emailErrorMessage ? (
            <CompleteWithEmailErrorStep
              emailErrorMessage={flow.emailErrorMessage}
              mailgunConfigured={site.mailgunConfigured}
              post={post}
              retryFailure={flow.retryFailure}
              status={flow.retryStatus}
              willOnlyEmail={state.willOnlyEmail}
              onRetry={() => void flow.retryEmail()}
            />
          ) : step === 'complete' ? (
            <CompleteStep
              captured={flow.captured}
              completedAt={flow.completedAt}
              note={flow.emailNote}
              post={post}
              postCount={flow.postCount}
              siteTitle={siteTitle}
              state={state}
              timezone={timezone}
              onRevertToDraft={onRevertToDraft}
            />
          ) : step === 'confirm' ? (
            <ConfirmStep
              captured={flow.captured}
              failure={flow.failure}
              post={post}
              state={state}
              status={flow.confirmStatus}
              timezone={timezone}
              onBack={flow.toOptions}
              onConfirm={() => void flow.confirmPublish()}
            />
          ) : (
            <OptionsStep
              emailDisabledInSettings={site.editorDefaultEmailRecipients === 'disabled'}
              limitsChecked={flow.limitsChecked}
              post={post}
              state={state}
              timezone={timezone}
              onContinue={flow.toConfirm}
              onSetNewsletter={transition((value) => machine.setNewsletter(value))}
              onSetPublishType={transition((value) => machine.setPublishType(value))}
              onSetRecipientFilter={transition((value) => machine.setRecipientFilter(value))}
              onSetScheduledAt={transition((value) => machine.setScheduledAt(value))}
              onToggleScheduled={transition((value) => machine.setIsScheduled(value))}
            />
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
