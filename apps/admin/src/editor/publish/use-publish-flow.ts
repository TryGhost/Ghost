import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useRetryEmail } from '@tryghost/admin-x-framework/api/emails';
import { createEmailConfirmation } from './email-confirmation';
import { createPublishOptions } from './publish-options';
import { describeCompletionFailure, type CompletionFailure } from './completion-message';
import { EDITOR_FETCH_OPTIONS } from './request-options';
import { writePublishCelebration } from './celebration-handoff';
import type { EmailConfirmationOutcome } from './email-confirmation';
import type { PublishFlowPost } from './flow-post';
import type {
  PublishDispatch,
  PublishLimitPorts,
  PublishOptionsMachine,
  PublishOptionsState,
  PublishSiteInput,
  PublishUserInput,
} from './publish-options';
import type { SaveCompletion } from '@/editor/engine/save-engine';

export type PublishStep = 'options' | 'confirm' | 'complete' | 'email-error';
export type ConfirmStatus = 'idle' | 'running' | 'success' | 'failure';

export type PublishDispatcher = (dispatch: PublishDispatch) => Promise<SaveCompletion>;

export interface PublishFlowOptions {
  post: PublishFlowPost;
  site: PublishSiteInput;
  user: PublishUserInput;
  limits?: PublishLimitPorts;
  /** The machine's clock, injected for tests. */
  now?: () => Date;
  dispatch: PublishDispatcher;
  onBeforePublish?: () => Promise<void>;
  onCompleted?: (info: { postId: string; isScheduled: boolean; hasEmail: boolean }) => void;
}

export interface PublishFlow {
  machine: PublishOptionsMachine;
  state: PublishOptionsState;
  step: PublishStep;
  confirmStatus: ConfirmStatus;
  failure: CompletionFailure | null;
  emailErrorMessage: string | null;
  /** The site's published count including this post, for the complete step's copy. */
  postCount: number | null;
  /** When the publish landed, standing in for the publish time the server stamped. */
  completedAt: string | null;
  /** False until `checkLimits()` settles; the options step cannot be left before then. */
  limitsChecked: boolean;
  /** Set when the publish landed but its email could not be confirmed either way. */
  emailNote: string | null;
  /** Publish intent captured on entering confirm, so saving cannot change the copy. */
  captured: {
    willPublish: boolean;
    willEmail: boolean;
    willOnlyEmail: boolean;
    isScheduled: boolean;
  };
  /** Re-renders after a machine transition; the machine has no subscription. */
  refresh: () => void;
  toConfirm: () => void;
  toOptions: () => void;
  confirmPublish: () => Promise<void>;
  retryEmail: () => Promise<void>;
  retryStatus: ConfirmStatus;
  retryFailure: string | null;
}

const UNKNOWN_EMAIL_ERROR = 'Unknown error';
const UNKNOWN_RETRY_ERROR = 'Unknown Error occurred when attempting to resend';
export const EMAIL_UNCONFIRMED =
  'This was published, but we could not confirm the newsletter was sent. Check the post’s email status from the posts list.';

function initialEmailError(post: PublishFlowPost): string | null {
  return post.email?.status === 'failed' ? (post.email.error ?? UNKNOWN_EMAIL_ERROR) : null;
}

export function usePublishFlow({
  post,
  site,
  user,
  limits,
  now,
  dispatch,
  onBeforePublish,
  onCompleted,
}: PublishFlowOptions): PublishFlow {
  const fetchApi = useFetchApi();
  const { mutateAsync: retryEmailRequest } = useRetryEmail();
  const [, refresh] = useReducer((tick: number) => tick + 1, 0);

  // The machine reads its inputs once, so it is keyed on the post rather than on
  // the identity of props a re-rendering caller rebuilds.
  const inputs = useRef({ post, site, user, limits, now });
  inputs.current = { post, site, user, limits, now };

  const machine = useMemo(() => {
    const current = inputs.current;

    return createPublishOptions({
      post: { ...current.post, isPage: current.post.displayName === 'page' },
      site: current.site,
      user: current.user,
      limits: current.limits,
      now: current.now,
    });
  }, [post.id]);

  // The email is created by the save, so its id is only knowable from a reload.
  const emailIdRef = useRef<string | null>(post.email?.id ?? null);

  const confirmation = useMemo(
    () =>
      createEmailConfirmation({
        reload: async (postId) => {
          const data = await fetchApi<{ posts: PublishFlowPost[] }>(
            apiUrl(`/posts/${postId}/`, { include: 'email' }),
            EDITOR_FETCH_OPTIONS,
          );
          const reloaded = data.posts?.[0];
          emailIdRef.current = reloaded?.email?.id ?? emailIdRef.current;
          return { status: reloaded?.status, email: reloaded?.email ?? null };
        },
        retry: async (emailId) => {
          await retryEmailRequest(emailId);
        },
      }),
    [fetchApi, retryEmailRequest],
  );

  const [step, setStep] = useState<PublishStep>(() =>
    initialEmailError(post) ? 'email-error' : 'options',
  );
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('idle');
  const [failure, setFailure] = useState<CompletionFailure | null>(null);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(() =>
    initialEmailError(post),
  );
  const [postCount, setPostCount] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [limitsChecked, setLimitsChecked] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<ConfirmStatus>('idle');
  const [retryFailure, setRetryFailure] = useState<string | null>(null);
  const [captured, setCaptured] = useState({
    willPublish: true,
    willEmail: false,
    willOnlyEmail: false,
    isScheduled: false,
  });

  // A schedule chosen before the editor sat idle may now be in the past.
  useEffect(() => {
    machine.resetPastScheduledAt();
    let cancelled = false;

    void machine.checkLimits().then(() => {
      if (!cancelled) {
        setLimitsChecked(true);
        refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [machine]);

  const confirmationRef = useRef(confirmation);
  confirmationRef.current = confirmation;

  // Only leaving the flow abandons a poll; a re-render must not interrupt one.
  useEffect(() => () => confirmationRef.current.cancel(), []);

  const state = machine.getState();

  const fetchPostCount = useCallback(async () => {
    // No count is shown for pages, scheduled posts, or email-only posts.
    if (post.displayName === 'page' || state.isScheduled || !state.willPublish) {
      setPostCount(null);
      return;
    }

    try {
      const data = await fetchApi<{ meta?: { pagination?: { total?: number } } }>(
        apiUrl('/posts/', { filter: 'status:published', limit: '1' }),
        EDITOR_FETCH_OPTIONS,
      );
      setPostCount((data.meta?.pagination?.total ?? 0) + 1);
    } catch {
      setPostCount(null);
    }
  }, [fetchApi, post.displayName, state.isScheduled, state.willPublish]);

  const toConfirm = useCallback(() => {
    setCaptured({
      willPublish: state.willPublish,
      willEmail: state.willEmail,
      willOnlyEmail: state.willOnlyEmail,
      isScheduled: state.isScheduled,
    });
    setFailure(null);
    setConfirmStatus('idle');
    setStep('confirm');
    void fetchPostCount();
  }, [fetchPostCount, state]);

  const toOptions = useCallback(() => {
    setStep('options');
    setConfirmStatus('idle');
  }, []);

  const complete = useCallback(
    (isScheduled: boolean, hasEmail: boolean) => {
      setEmailErrorMessage(null);
      setConfirmStatus('success');
      setStep('complete');
      // The server stamps the publish time; this is the closest the client has.
      setCompletedAt(new Date().toISOString());
      writePublishCelebration({ postId: post.id, displayName: post.displayName, isScheduled });
      onCompleted?.({ postId: post.id, isScheduled, hasEmail });
    },
    [onCompleted, post.displayName, post.id],
  );

  const applyEmailOutcome = useCallback(
    (outcome: EmailConfirmationOutcome, isScheduled: boolean): void => {
      if (outcome.kind === 'failed') {
        setEmailErrorMessage(outcome.error ?? UNKNOWN_EMAIL_ERROR);
        setStep('email-error');
        setConfirmStatus('idle');
        return;
      }

      // Cancellation means the flow is being torn down, so nothing is completed
      // and the caller is never told to navigate.
      if (outcome.kind === 'cancelled') {
        setConfirmStatus('idle');
        return;
      }

      complete(isScheduled, outcome.kind !== 'not-needed');
    },
    [complete],
  );

  const confirmPublish = useCallback(async () => {
    if (confirmStatus === 'running') {
      return;
    }

    setFailure(null);
    setConfirmStatus('running');

    const command = machine.toDispatch();

    if (!command) {
      setFailure({ message: 'This post can no longer be published from here. Reload the editor.' });
      setConfirmStatus('failure');
      return;
    }

    const { isScheduled, willEmailImmediately, willEmail } = state;

    try {
      await onBeforePublish?.();
    } catch (error) {
      setFailure({ message: error instanceof Error ? error.message : String(error) });
      setConfirmStatus('failure');
      return;
    }

    const completion = await dispatch(command);
    const completionFailure = describeCompletionFailure(completion);

    if (completionFailure) {
      setFailure(completionFailure);
      setConfirmStatus('failure');
      // A re-auth interruption sends the user back to confirm and try again.
      setStep('confirm');
      return;
    }

    // Stays 'running' across the email poll: the publish is not finished until
    // the email is submitted, and the button must not invite a second dispatch.
    if (willEmailImmediately) {
      try {
        // No `currentPost`: the acknowledged result carries no email, and the
        // pre-save one would short-circuit the poll to "not needed".
        const outcome = await confirmation.confirm(post.id);
        applyEmailOutcome(outcome, isScheduled);
      } catch {
        // The post is published either way; only the email's fate is unknown,
        // so the flow completes rather than stranding a disabled button.
        setEmailNote(EMAIL_UNCONFIRMED);
        complete(isScheduled, true);
      }
      return;
    }

    complete(isScheduled, willEmail);
  }, [
    applyEmailOutcome,
    complete,
    confirmStatus,
    confirmation,
    dispatch,
    machine,
    onBeforePublish,
    post.id,
    state,
  ]);

  const retryEmail = useCallback(async () => {
    const emailId = emailIdRef.current;

    if (!emailId || retryStatus === 'running') {
      return;
    }

    setRetryFailure(null);
    setRetryStatus('running');

    try {
      const outcome = await confirmation.retryAndConfirm(post.id, emailId);

      if (outcome.kind === 'failed' || outcome.kind === 'cancelled') {
        if (outcome.kind === 'failed') {
          setEmailErrorMessage(outcome.error ?? UNKNOWN_EMAIL_ERROR);
        }
        setRetryStatus('idle');
        return;
      }

      setRetryStatus('success');
      complete(false, outcome.kind !== 'not-needed');
    } catch (error) {
      setRetryFailure(error instanceof Error ? error.message : UNKNOWN_RETRY_ERROR);
      setRetryStatus('failure');
    }
  }, [complete, confirmation, post.id, retryStatus]);

  return {
    machine,
    state,
    step,
    confirmStatus,
    failure,
    emailErrorMessage,
    postCount,
    completedAt,
    limitsChecked,
    emailNote,
    captured,
    refresh,
    toConfirm,
    toOptions,
    confirmPublish,
    retryEmail,
    retryStatus,
    retryFailure,
  };
}
