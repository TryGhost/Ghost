import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { PageHeader } from '@tryghost/shade/patterns';
import { formatNumber } from '@tryghost/shade/utils';
import { useEffect, useRef, useState } from 'react';
import {
  firstNameReminderDialog,
  publicPreviewWarningDialog,
  publishFlowModal,
  publishFlowPreview,
  tkReminderDialog,
} from '@tryghost/test-data/selectors/editor';
import { FullscreenDialog } from '@/editor/fullscreen-dialog';
import { CompleteStep } from './components/complete-step';
import { CompleteWithEmailErrorStep } from './components/complete-with-email-error-step';
import { ConfirmStep } from './components/confirm-step';
import { GateDialog } from './components/gate-dialog';
import { OptionsStep } from './components/options-step';
import { countFirstNameOutsideEmailCards } from './first-name-reminder';
import { isPage } from './flow-post';
import { PUBLIC_PREVIEW_WARNING_COPY, getPublicPreviewWarning } from './public-preview-warning';
import { createPublishOptions, isEmailDisabledInSettings } from './publish-options';
import { usePublishFlow } from './use-publish-flow';
import type { PublishDispatcher } from './publish-options';
import type { PublishFlowPost } from './flow-post';
import type {
  NewsletterInput,
  PublishLimitPorts,
  PublishSiteInput,
  PublishUserInput,
} from './publish-options';

export interface PublishFlowModalProps {
  post: PublishFlowPost;
  animate?: boolean;
  /** Disable when onCompleted navigates, keeping the pending step visible until it unmounts. */
  showCompletion?: boolean;
  site: PublishSiteInput;
  user: PublishUserInput;
  limits?: PublishLimitPorts;
  /** The publish machine's clock, injected for tests. */
  now?: () => Date;
  /**
   * The newsletter remembered for a draft, selected over the default when the flow
   * opens. A later change, such as a pick in the preview over the flow, switches the
   * open flow to it; undefined switches it back to the default.
   */
  draftNewsletter?: string;
  timezone: string;
  siteTitle?: string;
  /** Gates the flow behind a reminder when the body still has TK markers. */
  tkCount?: number;
  /** The `paywallImprovements` lab; the public-preview gate is off without it. */
  paywallImprovements?: boolean;
  /** The caller supplies the save engine's dispatch. */
  dispatch: PublishDispatcher;
  /** Asks the writer to sign in again; resolves true once they have. */
  requestReauth?: () => Promise<boolean>;
  onBeforePublish?: () => Promise<void>;
  onClose: () => void;
  /** Hears the flow's selected newsletter while it is open, and `undefined` once it closes. */
  onNewsletterChange?: (slug: string | undefined) => void;
  /** Hears a newsletter the writer picks in the options step. */
  onNewsletterPick?: (slug: string) => void;
  onPreview?: () => void;
  onRevertToDraft?: () => void;
  onCompleted?: (info: { postId: string; isScheduled: boolean; hasEmail: boolean }) => void;
}

/** Whether the flow could send this post as an email, before the host limits are checked. */
function canSendEmail(post: PublishFlowPost, site: PublishSiteInput, user: PublishUserInput) {
  const { emailUnavailable, emailDisabled } = createPublishOptions({
    post: { ...post, isPage: isPage(post) },
    site,
    user,
  }).getState();
  return !emailUnavailable && !emailDisabled;
}

export function PublishFlowModal({ post, ...props }: PublishFlowModalProps) {
  return <KeyedPublishFlowModal key={post.id} post={post} {...props} />;
}

/** A post change is a new journey; no gate, failure, or completion state carries across it. */
function KeyedPublishFlowModal({
  post,
  animate = true,
  showCompletion,
  site,
  user,
  limits,
  now,
  draftNewsletter,
  timezone,
  siteTitle,
  tkCount = 0,
  paywallImprovements = false,
  dispatch,
  requestReauth,
  onBeforePublish,
  onClose,
  onNewsletterChange,
  onNewsletterPick,
  onPreview,
  onRevertToDraft,
  onCompleted,
}: PublishFlowModalProps) {
  const [gatesPassed, setGatesPassed] = useState(false);
  const [previewWarningPassed, setPreviewWarningPassed] = useState(false);
  const previewWarning = paywallImprovements ? getPublicPreviewWarning(post) : null;
  // Decided once on opening, so a background read of the site cannot raise it mid-flow.
  const [firstNameReminder] = useState(
    () =>
      tkCount === 0 &&
      countFirstNameOutsideEmailCards(post.lexical) > 0 &&
      canSendEmail(post, site, user),
  );

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

  if (!gatesPassed && !previewWarningPassed && previewWarning) {
    return (
      <GateDialog
        testId={publicPreviewWarningDialog}
        title={PUBLIC_PREVIEW_WARNING_COPY[previewWarning].title}
        onBack={onClose}
        onContinue={() =>
          firstNameReminder ? setPreviewWarningPassed(true) : setGatesPassed(true)
        }
      >
        {PUBLIC_PREVIEW_WARNING_COPY[previewWarning].body}
      </GateDialog>
    );
  }

  if (!gatesPassed && firstNameReminder) {
    return (
      <GateDialog
        testId={firstNameReminderDialog}
        title="Quick check before publishing"
        onBack={onClose}
        onContinue={() => setGatesPassed(true)}
      >
        <code>{'{first_name}'}</code> was found in your post, but it only works inside an Email
        content card.
      </GateDialog>
    );
  }

  return (
    <PublishFlowDialog
      animate={animate}
      dispatch={dispatch}
      draftNewsletter={draftNewsletter}
      limits={limits}
      now={now}
      post={post}
      requestReauth={requestReauth}
      showCompletion={showCompletion}
      site={site}
      siteTitle={siteTitle}
      timezone={timezone}
      user={user}
      onBeforePublish={onBeforePublish}
      onClose={onClose}
      onCompleted={onCompleted}
      onNewsletterChange={onNewsletterChange}
      onNewsletterPick={onNewsletterPick}
      onPreview={onPreview}
      onRevertToDraft={onRevertToDraft}
    />
  );
}

type PublishFlowDialogProps = Omit<PublishFlowModalProps, 'tkCount' | 'paywallImprovements'>;

function PublishFlowDialog({
  post,
  animate = true,
  showCompletion,
  site,
  user,
  limits,
  now,
  draftNewsletter,
  timezone,
  siteTitle,
  dispatch,
  requestReauth,
  onBeforePublish,
  onClose,
  onNewsletterChange,
  onNewsletterPick,
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
    draftNewsletter,
    dispatch,
    requestReauth,
    showCompletion,
    onBeforePublish,
    onCompleted,
  });
  const { state, step, setNewsletter } = flow;
  const newsletterSlug = state.newsletter?.slug;

  useEffect(() => {
    onNewsletterChange?.(newsletterSlug);
    return () => onNewsletterChange?.(undefined);
  }, [newsletterSlug, onNewsletterChange]);

  // The flow opened on the draft's newsletter; only a later change to it, a pick in
  // the preview over the flow, moves the selection.
  const followedDraftNewsletter = useRef(draftNewsletter);
  const { newsletters } = state;
  useEffect(() => {
    if (followedDraftNewsletter.current === draftNewsletter) {
      return;
    }
    followedDraftNewsletter.current = draftNewsletter;
    const next = draftNewsletter
      ? newsletters.find((newsletter) => newsletter.slug === draftNewsletter)
      : newsletters[0];
    if (next && next.slug !== newsletterSlug) {
      setNewsletter(next);
    }
  }, [draftNewsletter, newsletterSlug, newsletters, setNewsletter]);

  const pickNewsletter = (newsletter: NewsletterInput | null) => {
    setNewsletter(newsletter);
    if (newsletter) {
      onNewsletterPick?.(newsletter.slug);
    }
  };

  // While the publish request is in flight, closing would abandon its outcome
  // unseen: a publish that lands would never navigate and one that fails would
  // never say so. The request settles on its own, so close waits for it.
  const close = () => {
    if (flow.publishInFlight) {
      return;
    }
    flow.cancel();
    onClose();
  };

  return (
    <FullscreenDialog
      animate={animate}
      data-testid={publishFlowModal}
      title="Publish"
      open
      onOpenChange={(open) => !open && close()}
    >
      <Box className="relative min-h-full">
        <Inline className="absolute inset-x-0 top-0 p-4" justify="between">
          <Text aria-hidden="true" as="h2" className="text-lg tracking-tight" weight="semibold">
            Publish
          </Text>
          <PageHeader.ActionGroup>
            {step === 'complete' ? null : (
              <>
                <Button disabled={flow.publishInFlight} variant="ghost" onClick={close}>
                  Close
                </Button>
                {flow.emailErrorMessage || !onPreview ? null : (
                  <Button
                    className="w-20 shrink-0"
                    data-testid={publishFlowPreview}
                    variant="outline"
                    onClick={onPreview}
                  >
                    Preview
                  </Button>
                )}
              </>
            )}
          </PageHeader.ActionGroup>
        </Inline>

        <Stack className="mx-auto w-full max-w-156 px-6 pt-[max(9.6rem,18vh)] pb-16" gap="xl">
          {step === 'email-error' && flow.emailErrorMessage ? (
            <CompleteWithEmailErrorStep
              canRetry={flow.canRetryEmail}
              checkingEligibility={flow.checkingRetryEligibility}
              eligibilityFailed={flow.retryEligibilityFailed}
              emailErrorMessage={flow.emailErrorMessage}
              mailgunConfigured={site.mailgunConfigured}
              post={post}
              retryFailure={flow.retryFailure}
              status={flow.retryStatus}
              willOnlyEmail={state.willOnlyEmail}
              onCheckEligibility={flow.checkRetryEligibility}
              onRetry={() => void flow.retryEmail()}
            />
          ) : step === 'complete' ? (
            <CompleteStep
              captured={flow.captured}
              completedAt={flow.completedAt}
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
              emailDisabledInSettings={isEmailDisabledInSettings(site)}
              limitsChecked={flow.limitsChecked}
              limitsFailure={flow.limitsFailure}
              post={post}
              state={state}
              timezone={timezone}
              onContinue={flow.toConfirm}
              onRetryLimits={flow.retryLimits}
              onSetNewsletter={pickNewsletter}
              onSetPublishType={flow.setPublishType}
              onSetRecipientFilter={flow.setRecipientFilter}
              onSetScheduledAt={flow.setScheduledAt}
              onToggleScheduled={flow.setIsScheduled}
            />
          )}
        </Stack>
      </Box>
    </FullscreenDialog>
  );
}
