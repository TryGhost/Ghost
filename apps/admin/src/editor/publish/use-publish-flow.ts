import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useRetryEmail } from '@tryghost/admin-x-framework/api/emails';
import {
  confirmationResponseSchema,
  publishedPostCountResponseSchema,
} from './api-response-schemas';
import { createEmailConfirmation } from './email-confirmation';
import { createPublishOptions } from './publish-options';
import {
  describeCompletionFailure,
  describeRejectedAction,
  type CompletionFailure,
} from './completion-message';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
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
  /** A failed limit check blocks review until the user retries it successfully. */
  limitsFailure: string | null;
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
  retryLimits: () => void;
  toConfirm: () => void;
  toOptions: () => void;
  confirmPublish: () => Promise<void>;
  retryEmail: () => Promise<void>;
  retryStatus: ConfirmStatus;
  retryFailure: string | null;
  /** Abandons any asynchronous continuation before the caller closes the modal. */
  cancel: () => void;
}

const UNKNOWN_EMAIL_ERROR = 'Unknown error';
const UNKNOWN_RETRY_ERROR = 'Unknown Error occurred when attempting to resend';
export const EMAIL_UNCONFIRMED =
  'We couldn’t confirm the newsletter was sent. Check the post’s email status from the posts list.';

function initialEmailError(post: PublishFlowPost): string | null {
  const didEmailFail =
    post.displayName === 'post' &&
    (post.status === 'published' || post.status === 'sent') &&
    post.email?.status === 'failed';

  return didEmailFail ? (post.email?.error ?? UNKNOWN_EMAIL_ERROR) : null;
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
          const data = confirmationResponseSchema.parse(
            await fetchApi<unknown>(
              apiUrl(`/posts/${postId}/`, { include: 'email' }),
              EDITOR_REQUEST_OPTIONS,
            ),
          );
          const reloaded = data.posts.at(0);

          if (!reloaded) {
            throw new Error('The published post was missing from its reload response.');
          }

          emailIdRef.current = reloaded.email?.id ?? emailIdRef.current;
          return { status: reloaded.status, email: reloaded.email ?? null };
        },
        retry: async (emailId) => {
          await retryEmailRequest({ id: emailId, ...EDITOR_REQUEST_OPTIONS });
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
  const [checkedMachine, setCheckedMachine] = useState<PublishOptionsMachine | null>(null);
  const [limitsFailure, setLimitsFailure] = useState<string | null>(null);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<ConfirmStatus>('idle');
  const [retryFailure, setRetryFailure] = useState<string | null>(null);
  const [captured, setCaptured] = useState(() => {
    if (initialEmailError(post)) {
      return {
        willPublish: post.status === 'published' && post.emailOnly !== true,
        willEmail: true,
        willOnlyEmail: post.emailOnly === true || post.status === 'sent',
        isScheduled: false,
      };
    }

    const initialState = machine.getState();
    return {
      willPublish: initialState.willPublish,
      willEmail: initialState.willEmail,
      willOnlyEmail: initialState.willOnlyEmail,
      isScheduled: initialState.isScheduled,
    };
  });
  const activeRef = useRef(true);
  const completedRef = useRef(false);
  const publishRunningRef = useRef(false);
  const retryRunningRef = useRef(false);
  const limitCheckGenerationRef = useRef(0);
  const limitCheckRef = useRef<{
    machine: PublishOptionsMachine;
    promise: Promise<void>;
  } | null>(null);

  const checkLimits = useCallback(async () => {
    const generation = limitCheckGenerationRef.current + 1;
    limitCheckGenerationRef.current = generation;
    setCheckedMachine(null);
    setLimitsFailure(null);
    const existing = limitCheckRef.current;
    const check =
      existing?.machine === machine
        ? existing
        : { machine, promise: machine.checkLimits().then(() => undefined) };
    limitCheckRef.current = check;

    try {
      await check.promise;
    } catch (error) {
      if (activeRef.current && generation === limitCheckGenerationRef.current) {
        const { message } = describeRejectedAction(error);
        setLimitsFailure(`Couldn’t check publishing limits. ${message}`);
        refresh();
      }
      return;
    } finally {
      if (limitCheckRef.current === check) {
        limitCheckRef.current = null;
      }
    }

    if (activeRef.current && generation === limitCheckGenerationRef.current) {
      setCheckedMachine(machine);
      refresh();
    }
  }, [machine]);

  // A schedule chosen before the editor sat idle may now be in the past.
  useEffect(() => {
    machine.resetPastScheduledAt();
    void checkLimits();

    return () => {
      limitCheckGenerationRef.current += 1;
    };
  }, [checkLimits, machine]);

  const confirmationRef = useRef(confirmation);
  confirmationRef.current = confirmation;
  const cancel = useCallback(() => {
    activeRef.current = false;
    confirmationRef.current.cancel();
    limitCheckGenerationRef.current += 1;
  }, []);

  // StrictMode replays this effect's cleanup before its second setup. Restore
  // activity on setup so that development mode does not leave the flow inert.
  useEffect(() => {
    activeRef.current = true;
    return cancel;
  }, [cancel]);

  const state = machine.getState();
  const limitsChecked = checkedMachine === machine;

  const fetchPostCount = useCallback(async () => {
    // No count is shown for pages, scheduled posts, or email-only posts.
    if (post.displayName === 'page' || state.isScheduled || !state.willPublish) {
      setPostCount(null);
      return;
    }

    try {
      const data = publishedPostCountResponseSchema.parse(
        await fetchApi<unknown>(
          apiUrl('/posts/', { filter: `status:published+id:-'${post.id}'`, limit: '1' }),
          EDITOR_REQUEST_OPTIONS,
        ),
      );
      if (activeRef.current) {
        setPostCount(data.meta.pagination.total + 1);
      }
    } catch {
      if (activeRef.current) {
        setPostCount(null);
      }
    }
  }, [fetchApi, post.displayName, post.id, state.isScheduled, state.willPublish]);

  const toConfirm = useCallback(() => {
    if (!limitsChecked || !state.canPublish) {
      return;
    }
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
  }, [fetchPostCount, limitsChecked, state]);

  const toOptions = useCallback(() => {
    if (publishRunningRef.current) {
      return;
    }
    setStep('options');
    setConfirmStatus('idle');
  }, []);

  const complete = useCallback(
    (isScheduled: boolean, hasEmail: boolean) => {
      if (!activeRef.current || completedRef.current) {
        return;
      }
      completedRef.current = true;
      setEmailErrorMessage(null);
      setConfirmStatus('success');
      setStep('complete');
      // The server stamps the publish time; this is the closest the client has.
      setCompletedAt(new Date().toISOString());
      try {
        writePublishCelebration({ postId: post.id, displayName: post.displayName, isScheduled });
      } finally {
        onCompleted?.({ postId: post.id, isScheduled, hasEmail });
      }
    },
    [onCompleted, post.displayName, post.id],
  );

  const applyEmailOutcome = useCallback(
    (outcome: EmailConfirmationOutcome, isScheduled: boolean): void => {
      if (!activeRef.current) {
        return;
      }

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

      if (outcome.kind !== 'submitted') {
        setEmailNote(EMAIL_UNCONFIRMED);
      }
      complete(isScheduled, outcome.kind !== 'not-needed');
    },
    [complete],
  );

  const confirmPublish = useCallback(async () => {
    if (publishRunningRef.current) {
      return;
    }

    publishRunningRef.current = true;
    setFailure(null);
    setConfirmStatus('running');

    const command = machine.toDispatch();

    if (!command) {
      publishRunningRef.current = false;
      setFailure({ message: 'This post can no longer be published from here. Reload the editor.' });
      setConfirmStatus('failure');
      return;
    }

    const { isScheduled, willEmailImmediately, willEmail } = state;

    try {
      await onBeforePublish?.();
    } catch (error) {
      if (activeRef.current) {
        publishRunningRef.current = false;
        setFailure(describeRejectedAction(error));
        setConfirmStatus('failure');
      }
      return;
    }

    if (!activeRef.current) {
      return;
    }

    let completion: SaveCompletion;

    try {
      completion = await dispatch(command);
    } catch (error) {
      if (activeRef.current) {
        publishRunningRef.current = false;
        setFailure(describeRejectedAction(error));
        setConfirmStatus('failure');
      }
      return;
    }

    if (!activeRef.current) {
      return;
    }
    const completionFailure = describeCompletionFailure(completion);

    if (completionFailure) {
      publishRunningRef.current = false;
      setFailure(completionFailure);
      setConfirmStatus('failure');
      // A re-auth interruption sends the user back to confirm and try again.
      setStep('confirm');
      return;
    }

    // Stays 'running' across the email poll: the publish is not finished until
    // the email is submitted, and the button must not invite a second dispatch.
    if (willEmailImmediately) {
      let outcome: EmailConfirmationOutcome;

      try {
        // No `currentPost`: the acknowledged result carries no email, and the
        // pre-save one would short-circuit the poll to "not needed".
        outcome = await confirmation.confirm(post.id);
      } catch {
        if (!activeRef.current) {
          return;
        }
        // The post is published either way; only the email's fate is unknown,
        // so the flow completes rather than stranding a disabled button.
        setEmailNote(EMAIL_UNCONFIRMED);
        complete(isScheduled, true);
        return;
      }

      applyEmailOutcome(outcome, isScheduled);
      return;
    }

    complete(isScheduled, willEmail);
  }, [
    applyEmailOutcome,
    complete,
    confirmation,
    dispatch,
    machine,
    onBeforePublish,
    post.id,
    state,
  ]);

  const retryEmail = useCallback(async () => {
    const emailId = emailIdRef.current;

    if (retryRunningRef.current) {
      return;
    }

    if (!emailId) {
      setRetryFailure(UNKNOWN_RETRY_ERROR);
      setRetryStatus('failure');
      return;
    }

    retryRunningRef.current = true;
    setRetryFailure(null);
    setRetryStatus('running');

    try {
      const outcome = await confirmation.retryAndConfirm(post.id, emailId);

      if (!activeRef.current) {
        return;
      }

      if (outcome.kind === 'failed' || outcome.kind === 'cancelled') {
        retryRunningRef.current = false;
        if (outcome.kind === 'failed') {
          setEmailErrorMessage(outcome.error ?? UNKNOWN_EMAIL_ERROR);
        }
        setRetryStatus('idle');
        return;
      }

      if (outcome.kind !== 'submitted') {
        setEmailNote(EMAIL_UNCONFIRMED);
      }
      setRetryStatus('success');
      complete(false, outcome.kind !== 'not-needed');
    } catch (error) {
      if (activeRef.current) {
        retryRunningRef.current = false;
        setRetryFailure(error instanceof Error ? error.message : UNKNOWN_RETRY_ERROR);
        setRetryStatus('failure');
      }
    }
  }, [complete, confirmation, post.id]);

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
    limitsFailure,
    emailNote,
    captured,
    refresh,
    retryLimits: () => void checkLimits(),
    toConfirm,
    toOptions,
    confirmPublish,
    retryEmail,
    retryStatus,
    retryFailure,
    cancel,
  };
}
