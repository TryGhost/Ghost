import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useEmailSendingStatus, useRetryEmail } from '@tryghost/admin-x-framework/api/emails';
import { pagesDataType } from '@tryghost/admin-x-framework/api/pages';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import {
  confirmationResponseSchema,
  publishedPostCountResponseSchema,
} from './api-response-schemas';
import { EmailRetryRequestError, createEmailConfirmation } from './email-confirmation';
import { LimitCheckError, createPublishOptions } from './publish-options';
import { reportPublishFailure } from './report-publish-failure';
import {
  CompletionFailureError,
  DROPPED_MESSAGE,
  RETRY_ELIGIBILITY_FAILED_MESSAGE,
  UNEXPECTED_MESSAGE,
  describeCompletionFailure,
  describeRejectedAction,
  type CompletionFailure,
} from './completion-message';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { isSessionInvalid } from '@/editor/session/error-mapping';
import { useMinimumDuration } from '@/hooks/use-minimum-duration';
import { writePublishCelebration } from './celebration-handoff';
import type { EmailConfirmationOutcome } from './email-confirmation';
import type { PublishFlowPost } from './flow-post';
import type {
  PublishDispatcher,
  PublishLimitPorts,
  PublishOptionsMachine,
  PublishOptionsState,
  PublishSiteInput,
  PublishUserInput,
} from './publish-options';
import type { SaveCompletion } from '@/editor/engine/save-engine';

export type PublishStep = 'options' | 'confirm' | 'complete' | 'email-error';
export type ConfirmStatus = 'idle' | 'running' | 'success' | 'failure';

/**
 * With `improveSendingUI` on, the least time a send shows its running state
 * before handing off to post analytics, so the hand-off is not instant.
 */
export const MIN_EMAIL_HANDOFF_LENGTH = 1500;

export interface PublishFlowOptions {
  post: PublishFlowPost;
  site: PublishSiteInput;
  user: PublishUserInput;
  limits?: PublishLimitPorts;
  /** The machine's clock, injected for tests. */
  now?: () => Date;
  dispatch: PublishDispatcher;
  /**
   * Asks the writer to sign in again, resolving true once they have. A limit check,
   * an eligibility read, an email retry or the read-back of an accepted send that
   * finds the session gone asks, and is repeated once the writer is back. A repeat
   * that finds it gone again fails rather than asking again.
   */
  requestReauth?: () => Promise<boolean>;
  showCompletion?: boolean;
  /** The `improveSendingUI` lab: a publish that emails completes without confirming the send, after `MIN_EMAIL_HANDOFF_LENGTH`. */
  improveSendingUI?: boolean;
  onBeforePublish?: () => Promise<void>;
  onCompleted?: (info: { postId: string; isScheduled: boolean; hasEmail: boolean }) => void;
}

type PublishOptionActions = Pick<
  PublishOptionsMachine,
  'setPublishType' | 'setNewsletter' | 'setRecipientFilter' | 'setScheduledAt' | 'setIsScheduled'
>;

export interface PublishFlow extends PublishOptionActions {
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
  /**
   * Set when a caller that hides the completion step must still be shown that the
   * email could not be confirmed: the flow waits on `acknowledgeCompletion()`
   * before it calls `onCompleted`.
   */
  awaitingAcknowledgement: boolean;
  acknowledgeCompletion: () => void;
  /** True while the publish request itself is in flight; closing then would hide its outcome. */
  publishInFlight: boolean;
  /** Publish intent captured on entering confirm, so saving cannot change the copy. */
  captured: {
    willPublish: boolean;
    willEmail: boolean;
    willOnlyEmail: boolean;
    isScheduled: boolean;
    /** An email type was chosen with no recipients, so the post publishes without one. */
    skipsEmail: boolean;
  };
  retryLimits: () => void;
  toConfirm: () => void;
  toOptions: () => void;
  confirmPublish: () => Promise<void>;
  retryEmail: () => Promise<void>;
  retryStatus: ConfirmStatus;
  retryFailure: CompletionFailure | null;
  canRetryEmail: boolean;
  /** Whether the email can be retried could not be read, so the retry is not offered. */
  retryEligibilityFailed: boolean;
  checkingRetryEligibility: boolean;
  checkRetryEligibility: () => void;
  /** Abandons any asynchronous continuation before the caller closes the modal. */
  cancel: () => void;
}

const UNKNOWN_EMAIL_ERROR = 'Unknown error';
const UNKNOWN_RETRY_ERROR = 'Unknown Error occurred when attempting to resend';
export const EMAIL_UNCONFIRMED =
  'We couldn’t confirm the newsletter was sent. Check the post’s email status from the posts list.';
export const SCHEDULE_PASSED =
  'The scheduled time has passed. Go back and choose a future date and time.';

/** The error the flow opens on: set only for a published or sent post whose email failed. */
export function initialEmailError(post: PublishFlowPost): string | null {
  const didEmailFail =
    post.displayName === 'post' &&
    (post.status === 'published' || post.status === 'sent') &&
    post.email?.status === 'failed';

  return didEmailFail ? post.email?.error || UNKNOWN_EMAIL_ERROR : null;
}

function captureIntent(state: PublishOptionsState): PublishFlow['captured'] {
  return {
    willPublish: state.willPublish,
    willEmail: state.willEmail,
    willOnlyEmail: state.willOnlyEmail,
    isScheduled: state.isScheduled,
    skipsEmail: state.missingRecipients && state.willPublish,
  };
}

export function usePublishFlow({
  post,
  site,
  user,
  limits,
  now,
  dispatch,
  requestReauth,
  showCompletion = true,
  improveSendingUI = false,
  onBeforePublish,
  onCompleted,
}: PublishFlowOptions): PublishFlow {
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const { mutateAsync: retryEmailRequest } = useRetryEmail();
  const [, refresh] = useReducer((tick: number) => tick + 1, 0);

  // The machine reads its inputs once, so it is keyed on the post rather than on
  // the identity of props a re-rendering caller rebuilds.
  const inputs = useRef({ post, site, user, limits, now });
  inputs.current = { post, site, user, limits, now };
  const requestReauthRef = useRef(requestReauth);
  requestReauthRef.current = requestReauth;
  const activeRef = useRef(true);

  /** Signs the writer in again when `error` is an expired session; true once they are back. */
  const reauthenticated = useCallback(async (error: unknown): Promise<boolean> => {
    const reauth = requestReauthRef.current;
    return Boolean(reauth && isSessionInvalid(error) && (await reauth()));
  }, []);

  /**
   * Runs `attempt`; a failure on an expired session asks the writer to sign in and,
   * once they have, runs `again` (the attempt itself by default) once more. A session
   * that is gone again straight after a sign-in fails rather than asking again, so
   * the writer is never asked in a loop; their next action asks.
   */
  const withSignIn = useCallback(
    async <T>(
      attempt: () => Promise<T>,
      {
        causeOf = (error: unknown) => error,
        again = attempt,
      }: { causeOf?: (error: unknown) => unknown; again?: (error: unknown) => Promise<T> } = {},
    ): Promise<T> => {
      let failure: unknown;
      try {
        return await attempt();
      } catch (error) {
        if (!activeRef.current || !(await reauthenticated(causeOf(error))) || !activeRef.current) {
          throw error;
        }
        failure = error;
      }
      return again(failure);
    },
    [reauthenticated],
  );

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

  // Keep model changes and React updates together; callers only receive actions.
  const optionActions = useMemo<PublishOptionActions>(
    () => ({
      setPublishType: (value) => {
        machine.setPublishType(value);
        refresh();
      },
      setNewsletter: (value) => {
        machine.setNewsletter(value);
        refresh();
      },
      setRecipientFilter: (value) => {
        machine.setRecipientFilter(value);
        refresh();
      },
      setScheduledAt: (value) => {
        machine.setScheduledAt(value);
        refresh();
      },
      setIsScheduled: (value) => {
        machine.setIsScheduled(value);
        refresh();
      },
    }),
    [machine],
  );

  // The email is created by the save, so its id is only knowable from a reload.
  const [emailId, setEmailId] = useState(post.email?.id ?? null);

  const reloadPost = useCallback(
    async (postId: string) => {
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

      if (reloaded.email?.id && activeRef.current) {
        setEmailId(reloaded.email.id);
      }
      return { status: reloaded.status, email: reloaded.email ?? null };
    },
    [fetchApi],
  );

  const confirmation = useMemo(
    () =>
      createEmailConfirmation({
        reload: reloadPost,
        retry: async (id) => {
          await retryEmailRequest({ id, sessionExpiryRedirect: false });
        },
      }),
    [reloadPost, retryEmailRequest],
  );

  // The poll reads around the query cache, so a settled send refreshes the post reads.
  const invalidatePostReads = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [post.displayName === 'page' ? pagesDataType : postsDataType],
    });
  }, [post.displayName, queryClient]);
  const refreshPostReads = useCallback(
    (outcome: EmailConfirmationOutcome) => {
      if (outcome.kind !== 'cancelled') {
        invalidatePostReads();
      }
    },
    [invalidatePostReads],
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
  const [pendingCompletion, setPendingCompletion] = useState<{
    isScheduled: boolean;
    hasEmail: boolean;
  } | null>(null);
  const [publishInFlight, setPublishInFlight] = useState(false);
  const [retryStatus, setRetryStatus] = useState<ConfirmStatus>('idle');
  const [retryFailure, setRetryFailure] = useState<CompletionFailure | null>(null);
  const [findingEmail, setFindingEmail] = useState(false);
  const retryEligibility = useEmailSendingStatus(emailId ?? '', {
    // Paused while a retry runs so the send in progress cannot hide its own button;
    // re-enabling refetches, so every way a retry ends refreshes eligibility.
    enabled: step === 'email-error' && Boolean(emailId) && retryStatus !== 'running',
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const sending = retryEligibility.data?.email_statuses[0]?.sending;
  // A background read error keeps the last successful decision. Core still
  // validates fresh state before accepting a retry.
  const canRetryEmail =
    retryEligibility.isFetchedAfterMount &&
    sending?.status === 'failed' &&
    sending.retryable === true;
  // Ember's "Check retry availability": an unread eligibility is said so, not hidden.
  // Without an email id there is nothing to read, so the check reloads the post for one.
  const retryEligibilityFailed =
    step === 'email-error' &&
    retryStatus !== 'running' &&
    (!emailId || (retryEligibility.isError && retryEligibility.data === undefined));
  const checkingRetryEligibility = findingEmail || retryEligibility.isFetching;
  const eligibilityError = retryEligibility.error;

  useEffect(() => {
    if (eligibilityError && step === 'email-error') {
      reportPublishFailure('retry-eligibility', RETRY_ELIGIBILITY_FAILED_MESSAGE, {
        error: eligibilityError,
        postId: post.id,
      });
    }
  }, [eligibilityError, post.id, step]);

  const refetchEligibility = retryEligibility.refetch;
  const refetchEligibilityRef = useRef(refetchEligibility);
  refetchEligibilityRef.current = refetchEligibility;
  // Set once a failed eligibility read has asked for sign-in. Background reads that fail
  // again do not ask again until a read succeeds or the writer checks again themselves.
  const eligibilitySignInAskedRef = useRef(false);
  if (retryEligibility.isSuccess && !retryEligibility.isFetching) {
    eligibilitySignInAskedRef.current = false;
  }

  // An eligibility read that found the session gone asks for sign-in and reads again.
  useEffect(() => {
    if (
      !eligibilityError ||
      step !== 'email-error' ||
      eligibilitySignInAskedRef.current ||
      !isSessionInvalid(eligibilityError)
    ) {
      return;
    }
    eligibilitySignInAskedRef.current = true;
    void reauthenticated(eligibilityError).then((signedIn) => {
      if (signedIn && activeRef.current) {
        void refetchEligibilityRef.current();
      }
    });
  }, [eligibilityError, reauthenticated, step]);

  const checkRetryEligibility = useCallback(() => {
    eligibilitySignInAskedRef.current = false;
    if (emailId) {
      void refetchEligibility();
      return;
    }

    setFindingEmail(true);
    // A post whose email still has no id stays unchecked; the writer can check again.
    withSignIn(() => reloadPost(post.id))
      .catch((error: unknown) => {
        if (activeRef.current) {
          reportPublishFailure('retry-eligibility', RETRY_ELIGIBILITY_FAILED_MESSAGE, {
            error,
            postId: post.id,
          });
        }
      })
      .finally(() => {
        if (activeRef.current) {
          setFindingEmail(false);
        }
      });
  }, [emailId, post.id, refetchEligibility, reloadPost, withSignIn]);

  const [captured, setCaptured] = useState<PublishFlow['captured']>(() => {
    if (initialEmailError(post)) {
      return {
        willPublish: post.status === 'published' && post.emailOnly !== true,
        willEmail: true,
        willOnlyEmail: post.emailOnly === true || post.status === 'sent',
        isScheduled: false,
        skipsEmail: false,
      };
    }

    return captureIntent(machine.getState());
  });
  const completedRef = useRef(false);
  const publishRunningRef = useRef(false);
  const retryRunningRef = useRef(false);
  const handoffMinimum = useMinimumDuration(MIN_EMAIL_HANDOFF_LENGTH);
  const limitCheckGenerationRef = useRef(0);
  const limitCheckRef = useRef<{
    machine: PublishOptionsMachine;
    promise: Promise<void>;
  } | null>(null);

  const checkLimits = useCallback(async () => {
    // Repeated once, only after the writer signs in again on an expired session; a
    // session gone again straight after that sign-in fails rather than asking again.
    for (let signedInAgain = false; ; signedInAgain = true) {
      const generation = limitCheckGenerationRef.current + 1;
      limitCheckGenerationRef.current = generation;
      const isCurrent = () => activeRef.current && generation === limitCheckGenerationRef.current;
      setCheckedMachine(null);
      setLimitsFailure(null);
      const existing = limitCheckRef.current;
      const check =
        existing?.machine === machine
          ? existing
          : { machine, promise: machine.checkLimits().then(() => undefined) };
      limitCheckRef.current = check;

      let rejection: { error: unknown } | null = null;
      try {
        await check.promise;
      } catch (error) {
        rejection = { error };
      } finally {
        if (limitCheckRef.current === check) {
          limitCheckRef.current = null;
        }
      }

      if (!isCurrent()) {
        return;
      }

      if (!rejection) {
        setCheckedMachine(machine);
        refresh();
        return;
      }

      const { error } = rejection;
      const checkFailure = error instanceof LimitCheckError;
      const cause = checkFailure ? error.cause : error;
      const signedIn = !signedInAgain && (await reauthenticated(cause));
      if (!isCurrent()) {
        return;
      }
      if (signedIn) {
        continue;
      }

      const { message } = describeRejectedAction(cause);
      const shown = `${
        checkFailure && error.limit === 'emails'
          ? 'Couldn’t check email limits.'
          : 'Couldn’t check publishing limits.'
      } ${message}`;
      setLimitsFailure(shown);
      reportPublishFailure('limit-check', shown, { error, postId: inputs.current.post.id });
      refresh();
      return;
    }
  }, [machine, reauthenticated]);

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
    setCaptured(captureIntent(state));
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

  const finish = useCallback(
    (isScheduled: boolean, hasEmail: boolean) => {
      try {
        writePublishCelebration({ postId: post.id, displayName: post.displayName, isScheduled });
      } finally {
        onCompleted?.({ postId: post.id, isScheduled, hasEmail });
      }
    },
    [onCompleted, post.displayName, post.id],
  );

  /**
   * `unconfirmed` marks a publish whose email could not be confirmed. A caller
   * that hides the completion step navigates on `onCompleted`, so the flow shows
   * the step with its note and waits for the writer to acknowledge it first:
   * otherwise the destination would read as a confirmed send.
   */
  const complete = useCallback(
    (isScheduled: boolean, hasEmail: boolean, unconfirmed = false) => {
      if (!activeRef.current || completedRef.current) {
        return;
      }
      completedRef.current = true;
      const holdForAcknowledgement = unconfirmed && !showCompletion;
      if (showCompletion || holdForAcknowledgement) {
        setEmailErrorMessage(null);
        setConfirmStatus('success');
        setStep('complete');
        // The server stamps the publish time; this is the closest the client has.
        setCompletedAt(new Date().toISOString());
      }
      if (holdForAcknowledgement) {
        setPendingCompletion({ isScheduled, hasEmail });
        return;
      }
      finish(isScheduled, hasEmail);
    },
    [finish, showCompletion],
  );

  const acknowledgeCompletion = useCallback(() => {
    if (!activeRef.current || !pendingCompletion) {
      return;
    }
    setPendingCompletion(null);
    finish(pendingCompletion.isScheduled, pendingCompletion.hasEmail);
  }, [finish, pendingCompletion]);

  /**
   * `cause` is the read-back's failure, when one stopped it: an expected one (an
   * abandoned sign-in, a lost connection) is not reported.
   */
  const noteUnconfirmed = useCallback(
    (cause?: unknown) => {
      setEmailNote(EMAIL_UNCONFIRMED);
      reportPublishFailure(
        'email-unconfirmed',
        EMAIL_UNCONFIRMED,
        cause === undefined ? { postId: post.id } : { error: cause, postId: post.id },
      );
    },
    [post.id],
  );

  const showEmailFailure = useCallback(
    (error: string | null) => {
      const message = error || UNKNOWN_EMAIL_ERROR;
      setEmailErrorMessage(message);
      reportPublishFailure('email-failed', message, { postId: post.id });
    },
    [post.id],
  );

  const applyEmailOutcome = useCallback(
    (outcome: EmailConfirmationOutcome, isScheduled: boolean): void => {
      if (!activeRef.current) {
        return;
      }

      if (outcome.kind === 'failed') {
        showEmailFailure(outcome.error);
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

      const unconfirmed = outcome.kind !== 'submitted';
      if (unconfirmed) {
        noteUnconfirmed();
      }
      complete(isScheduled, outcome.kind !== 'not-needed', unconfirmed);
    },
    [complete, noteUnconfirmed, showEmailFailure],
  );

  const confirmPublish = useCallback(async () => {
    if (publishRunningRef.current) {
      return;
    }

    // The chosen time can pass while the flow sits open, or while the pre-save
    // cleanup waits on a sign-in, so it is checked against the clock at the click
    // and again before the publish is sent. Scheduling is not switched off here:
    // that would turn the confirmed schedule into an immediate publish.
    const schedulePassed = () => {
      const current = machine.getState();
      return (
        current.isScheduled && Date.parse(current.scheduledAt) < Date.parse(current.minScheduledAt)
      );
    };

    if (schedulePassed()) {
      setFailure({ message: SCHEDULE_PASSED });
      setConfirmStatus('failure');
      return;
    }

    publishRunningRef.current = true;
    handoffMinimum.start();
    setFailure(null);
    setConfirmStatus('running');

    const command = machine.toDispatch();

    if (!command) {
      publishRunningRef.current = false;
      setFailure({ message: DROPPED_MESSAGE });
      setConfirmStatus('failure');
      reportPublishFailure('no-command', DROPPED_MESSAGE, { postId: post.id });
      return;
    }

    const { isScheduled, willEmailImmediately, willEmail } = state;

    try {
      await onBeforePublish?.();
    } catch (error) {
      if (activeRef.current) {
        publishRunningRef.current = false;
        const shown = describeRejectedAction(error, UNEXPECTED_MESSAGE);
        setFailure(shown);
        setConfirmStatus('failure');
        // A save that settled as failed was reported by the session; anything else is a fault.
        if (!(error instanceof CompletionFailureError)) {
          reportPublishFailure('pre-publish-save', shown.message, { error, postId: post.id });
        }
      }
      return;
    }

    if (!activeRef.current) {
      return;
    }

    if (schedulePassed()) {
      publishRunningRef.current = false;
      setFailure({ message: SCHEDULE_PASSED });
      setConfirmStatus('failure');
      return;
    }

    let completion: SaveCompletion;

    setPublishInFlight(true);
    try {
      completion = await dispatch(command);
    } catch (error) {
      if (activeRef.current) {
        publishRunningRef.current = false;
        setPublishInFlight(false);
        const shown = describeRejectedAction(error, UNEXPECTED_MESSAGE);
        setFailure(shown);
        setConfirmStatus('failure');
        // The dispatch settles every save it runs; a rejection is a fault in getting there.
        reportPublishFailure('publish-request', shown.message, { error, postId: post.id });
      }
      return;
    }

    if (!activeRef.current) {
      return;
    }
    setPublishInFlight(false);
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
    if (willEmailImmediately && !improveSendingUI) {
      let outcome: EmailConfirmationOutcome;

      try {
        // No `currentPost`: the acknowledged result carries no email, and the
        // pre-save one would short-circuit the poll to "not needed". A read-back
        // that finds the session gone asks for sign-in and reads again.
        outcome = await withSignIn(() => confirmation.confirm(post.id));
      } catch (error) {
        if (!activeRef.current) {
          return;
        }
        // The post is published either way; only the email's fate is unknown,
        // so the flow completes rather than stranding a disabled button.
        invalidatePostReads();
        noteUnconfirmed(error);
        complete(isScheduled, true, true);
        return;
      }

      refreshPostReads(outcome);
      applyEmailOutcome(outcome, isScheduled);
      return;
    }

    if (willEmailImmediately) {
      await handoffMinimum.elapsed();
    }

    complete(isScheduled, willEmail);
  }, [
    applyEmailOutcome,
    complete,
    confirmation,
    dispatch,
    handoffMinimum,
    improveSendingUI,
    invalidatePostReads,
    machine,
    noteUnconfirmed,
    onBeforePublish,
    post.id,
    refreshPostReads,
    state,
    withSignIn,
  ]);

  const retryEmail = useCallback(async () => {
    if (retryRunningRef.current || !canRetryEmail || !emailId) {
      return;
    }

    retryRunningRef.current = true;
    setRetryFailure(null);
    setRetryStatus('running');

    let outcome: EmailConfirmationOutcome;
    try {
      // A retry request that found the session gone is sent again once the writer
      // signs in; an accepted retry whose read-back found it gone is only read again.
      outcome = await withSignIn(() => confirmation.retryAndConfirm(post.id, emailId), {
        causeOf: (error) => (error instanceof EmailRetryRequestError ? error.cause : error),
        again: (error) =>
          error instanceof EmailRetryRequestError
            ? confirmation.retryAndConfirm(post.id, emailId)
            : confirmation.confirm(post.id),
      });
    } catch (error) {
      if (!activeRef.current) {
        return;
      }

      // Core accepted the retry and only reading back how it went failed, so the
      // retry is not reported as failed: the send's fate is unknown, as after a publish.
      if (!(error instanceof EmailRetryRequestError)) {
        retryRunningRef.current = false;
        invalidatePostReads();
        noteUnconfirmed(error);
        if (showCompletion) {
          setRetryStatus('success');
        }
        complete(false, true, true);
        return;
      }

      const retryError = describeRejectedAction(error.cause, UNKNOWN_RETRY_ERROR);
      retryRunningRef.current = false;
      setRetryFailure(retryError);
      setRetryStatus('failure');
      reportPublishFailure('retry-request', retryError.message, {
        error: error.cause,
        postId: post.id,
      });
      return;
    }

    refreshPostReads(outcome);

    if (!activeRef.current) {
      return;
    }

    if (outcome.kind === 'failed' || outcome.kind === 'cancelled') {
      retryRunningRef.current = false;
      if (outcome.kind === 'failed') {
        showEmailFailure(outcome.error);
      }
      setRetryStatus('idle');
      return;
    }

    const unconfirmed = outcome.kind !== 'submitted';
    if (unconfirmed) {
      noteUnconfirmed();
    }
    if (showCompletion) {
      setRetryStatus('success');
    }
    complete(false, outcome.kind !== 'not-needed', unconfirmed);
  }, [
    canRetryEmail,
    complete,
    confirmation,
    emailId,
    invalidatePostReads,
    noteUnconfirmed,
    post.id,
    refreshPostReads,
    showCompletion,
    showEmailFailure,
    withSignIn,
  ]);

  return {
    ...optionActions,
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
    awaitingAcknowledgement: pendingCompletion !== null,
    acknowledgeCompletion,
    publishInFlight,
    captured,
    retryLimits: () => void checkLimits(),
    toConfirm,
    toOptions,
    confirmPublish,
    retryEmail,
    retryStatus,
    retryFailure,
    canRetryEmail,
    retryEligibilityFailed,
    checkingRetryEligibility,
    checkRetryEligibility,
    cancel,
  };
}
