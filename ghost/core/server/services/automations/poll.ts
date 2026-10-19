import type {
  AutomationMember,
  AutomationStepTerminalStatus,
  AutomationStepToRun,
  AutomationsRepository,
} from './automations-repository';
import type { AutomationTriggerTierScope } from './automations-repository-2';
import { getMailgunMessageId } from '../../lib/mailgun/mailgun-message-id';
import { getMailgunError } from '../../lib/mailgun/mailgun-error';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import { MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES } from '../member-welcome-emails/constants';
import { MAX_ATTEMPTS, MAX_STEPS_PER_BATCH, RETRY_DELAY_MS } from './constants';
import config from '../../../shared/config';

const settingsCache = require('../../../shared/settings-cache');

/**
 * HACK: Sending emails is slow, especially when lots of members enter an
 * automation at once (for example, when a label is added to a million members).
 * Until that's fixed, `send_email` steps are a no-op by default. Set
 * `automations:sendEmailNoop` to `false` to send emails.
 */
const isSendEmailNoop = (): boolean => config.get('automations:sendEmailNoop') !== false;

type MemberWelcomeEmailService = {
  init: () => unknown;
  api: {
    sendAutomationEmail: (options: {
      email: {
        designSettingId: string | null;
        lexical: string;
        subject: string;
      };
      member: {
        email: string;
        name: string | null;
        uuid: string;
      };
      memberStatus: 'free' | 'paid';
      trackOpens: boolean;
      trackClicks: boolean;
      automationActionRevisionId: string;
      automationRunStepId: string;
    }) => Promise<unknown>;
  };
};

type PollOptions = {
  automationsApi: Pick<
    AutomationsRepository,
    | 'fetchAndLockSteps'
    | 'finishStepAndEnqueueNext'
    | 'finishStepsAndEnqueueNext'
    | 'markStepsTerminal'
    | 'recordEmailSent'
    | 'retryStep'
  > & {
    findMembers: (memberIds: ReadonlyArray<string>) => Promise<Map<string, AutomationMember>>;
  };
  enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
  scheduleAutomationEmailAnalyticsJob: () => Promise<void>;
  memberWelcomeEmailService: MemberWelcomeEmailService;
};

/**
 * What to do with a step once it's been processed.
 *
 * Database writes are batched across all steps in a poll, which is much faster
 * than writing each step separately.
 */
type StepOutcome =
  | { type: 'finish' }
  | { type: 'terminal'; status: AutomationStepTerminalStatus }
  | { type: 'handled'; nextReadyAt: Date | null };

const MEMBER_STATUS_BY_TRIGGER_TIER_SCOPE = new Map<AutomationTriggerTierScope, 'free' | 'paid'>([
  ['free', 'free'],
  ['all_paid', 'paid'],
  ['selected_paid', 'paid'],
]);

const hasUpdatesAndAnnouncementsEnabled = (member: AutomationMember): boolean =>
  member.enable_updates_and_announcements ?? member.is_subscribed_to_any_newsletter;

const terminal = (status: AutomationStepTerminalStatus): StepOutcome => ({
  type: 'terminal',
  status,
});

const handleStepExecutionFailure = async ({
  automationsApi,
  err,
  step,
}: Readonly<{
  automationsApi: PollOptions['automationsApi'];
  err: unknown;
  step: AutomationStepToRun;
}>): Promise<Date | null> => {
  logging.error(
    {
      err: getMailgunError(err),
      system: {
        event: 'automations.poll.step_execution_failed',
        step_id: step.id,
      },
    },
    `[AUTOMATIONS] Failed to execute automation step ${step.id}`,
  );

  if (step.step_attempts < MAX_ATTEMPTS) {
    const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
    const didRetry = await automationsApi.retryStep(step, retryAt);
    if (didRetry) {
      return retryAt;
    }
  } else {
    logMaxAttemptsExceeded(step);
    await automationsApi.markStepsTerminal([step], 'failed');
  }

  return null;
};

const logMaxAttemptsExceeded = (step: AutomationStepToRun): void => {
  logging.warn(
    {
      system: {
        event: 'automations.poll.max_attempts',
        step_id: step.id,
      },
    },
    `[AUTOMATIONS] Step ${step.id} exceeded max attempts`,
  );
};

/**
 * Check whether the member still matches the automation's trigger.
 *
 * Returns the member's status (for email rendering) if they still match, or
 * the step's outcome if they don't.
 */
const checkTrigger = (
  step: AutomationStepToRun,
  member: AutomationMember,
): { memberStatus: 'free' | 'paid' } | { outcome: StepOutcome } => {
  switch (step.automation_trigger_type) {
    case 'membership_started': {
      const triggerTierScope = step.automation_trigger_tier_scope;
      if (!triggerTierScope) {
        logging.error(
          {
            system: {
              event: 'automations.poll.missing_trigger_tier_scope',
              step_id: step.id,
            },
          },
          `[AUTOMATIONS] Trigger tier scope is missing for step ${step.id}. Currently, this is unexpected`,
        );
        return { outcome: terminal('failed') };
      }

      const memberStatus = MEMBER_STATUS_BY_TRIGGER_TIER_SCOPE.get(triggerTierScope);
      if (!memberStatus) {
        logging.error(
          {
            system: {
              event: 'automations.poll.unsupported_trigger_tier_scope',
              trigger_tier_scope: triggerTierScope,
              step_id: step.id,
            },
          },
          `[AUTOMATIONS] Unsupported trigger tier scope for step ${step.id}: ${triggerTierScope}`,
        );
        return { outcome: terminal('failed') };
      }

      const eligibleStatuses = MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES[
        memberStatus
      ] as readonly string[];
      const doesMemberStatusStillMatchAutomation =
        eligibleStatuses.includes(member.status) &&
        (triggerTierScope !== 'selected_paid' ||
          member.tier_ids.some((tierId) => step.automation_trigger_tier_ids.includes(tierId)));
      if (!doesMemberStatusStillMatchAutomation) {
        return { outcome: terminal('member changed status') };
      }

      return { memberStatus };
    }
    case 'label_added': {
      // Members leave the automation if they no longer have any of its labels.
      const doesMemberStillHaveATriggerLabel = member.label_ids.some((labelId) =>
        step.automation_trigger_label_ids.includes(labelId),
      );
      if (!doesMemberStillHaveATriggerLabel) {
        return { outcome: terminal('member changed status') };
      }

      return { memberStatus: member.status === 'free' ? 'free' : 'paid' };
    }
    default: {
      const _exhaustive: never = step.automation_trigger_type;
      logging.error(
        {
          system: {
            event: 'automations.poll.unsupported_trigger_type',
            trigger_type: _exhaustive,
            step_id: step.id,
          },
        },
        `[AUTOMATIONS] Unsupported trigger type for step ${step.id}: ${_exhaustive}`,
      );
      return { outcome: terminal('failed') };
    }
  }
};

const sendEmail = async ({
  automationsApi,
  member,
  memberStatus,
  memberWelcomeEmailService,
  scheduleAutomationEmailAnalyticsJob,
  step,
}: Readonly<
  Pick<
    PollOptions,
    'automationsApi' | 'memberWelcomeEmailService' | 'scheduleAutomationEmailAnalyticsJob'
  > & {
    member: AutomationMember;
    memberStatus: 'free' | 'paid';
    step: Extract<AutomationStepToRun, { type: 'send_email' }>;
  }
>): Promise<void> => {
  memberWelcomeEmailService.init();
  const trackClicks = Boolean(settingsCache.get('email_track_clicks'));
  const trackOpens = Boolean(settingsCache.get('email_track_opens'));
  const sendResult = await memberWelcomeEmailService.api.sendAutomationEmail({
    email: {
      designSettingId: step.email_design_setting_id,
      lexical: step.email_lexical,
      subject: step.email_subject,
    },
    member: {
      // Note that we don't use `automation_run.member_email` here. That's only for the historical record, not for functionality.
      email: member.email,
      name: member.name,
      uuid: member.uuid,
    },
    memberStatus,
    trackOpens,
    trackClicks,
    automationActionRevisionId: step.automation_action_revision_id,
    automationRunStepId: step.id,
  });
  const mailgunMessageId = getMailgunMessageId(sendResult);
  // Only Mailgun sends can produce open events for automation emails
  const trackOpensForRecipient = trackOpens && Boolean(mailgunMessageId);
  try {
    await automationsApi.recordEmailSent({
      automationActionRevisionId: step.automation_action_revision_id,
      automationRunStepId: step.id,
      ...(mailgunMessageId ? { mailgunMessageId } : {}),
      memberEmail: member.email,
      memberId: member.id,
      memberName: member.name,
      memberUuid: member.uuid,
      trackClicks,
      trackOpens: trackOpensForRecipient,
    });
  } catch (err) {
    logging.error(
      {
        err,
        system: {
          event: 'automations.poll.recipient_persistence_failed',
          member_id: member.id,
          step_id: step.id,
        },
      },
      `[AUTOMATIONS] Failed to record automated email recipient for step ${step.id}`,
    );
  }
  if (mailgunMessageId) {
    try {
      await scheduleAutomationEmailAnalyticsJob();
    } catch (err) {
      logging.error(
        {
          err,
          system: {
            event: 'automations.poll.analytics_scheduling_failed',
            member_id: member.id,
            step_id: step.id,
          },
        },
        `[AUTOMATIONS] Failed to schedule email analytics job for step ${step.id}`,
      );
    }
  }
};

/**
 * Decide what to do with a step, performing any side effects (like sending an
 * email) along the way. Doesn't update the step itself; see `StepOutcome`.
 */
const processStep = async ({
  automationsApi,
  member,
  memberWelcomeEmailService,
  scheduleAutomationEmailAnalyticsJob,
  step,
}: Readonly<
  Pick<
    PollOptions,
    'automationsApi' | 'memberWelcomeEmailService' | 'scheduleAutomationEmailAnalyticsJob'
  > & {
    member: AutomationMember | undefined;
    step: AutomationStepToRun;
  }
>): Promise<StepOutcome> => {
  if (step.automation_status !== 'active') {
    return terminal('automation disabled');
  }

  if (step.step_attempts > MAX_ATTEMPTS) {
    logMaxAttemptsExceeded(step);
    return terminal('failed');
  }

  if (!step.member_id) {
    return terminal('member unsubscribed');
  }

  if (!member) {
    // It's possible that the member was deleted between the time the step was fetched and now, though it's
    // unlikely. That's why we log a warning, not an error.
    logging.warn(
      {
        system: {
          event: 'automations.poll.member_missing',
          member_id: step.member_id,
          step_id: step.id,
        },
      },
      `[AUTOMATIONS] Member ${step.member_id} for step ${step.id} doesn't exist`,
    );
    return terminal('member unsubscribed');
  }

  const triggerCheck = checkTrigger(step, member);
  if ('outcome' in triggerCheck) {
    return triggerCheck.outcome;
  }

  switch (step.type) {
    case 'wait':
      break;
    case 'send_email': {
      if (!hasUpdatesAndAnnouncementsEnabled(member)) {
        return terminal('member unsubscribed');
      }
      if (isSendEmailNoop()) {
        break;
      }
      try {
        await sendEmail({
          automationsApi,
          member,
          memberStatus: triggerCheck.memberStatus,
          memberWelcomeEmailService,
          scheduleAutomationEmailAnalyticsJob,
          step,
        });
      } catch (err) {
        return {
          type: 'handled',
          nextReadyAt: await handleStepExecutionFailure({ automationsApi, err, step }),
        };
      }
      break;
    }
    default: {
      const _exhaustive: never = step;
      throw new errors.InternalServerError({
        message: `Unexpected automation step type ${_exhaustive}`,
      });
    }
  }

  return { type: 'finish' };
};

const dateMin = (a: Date | null, b: Date | null): Date | null => {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a < b ? a : b;
};

const logStepFailure = (err: unknown, step: AutomationStepToRun): void => {
  logging.error(
    {
      err,
      system: {
        event: 'automations.poll.step_failed',
        step_id: step.id,
      },
    },
    `[AUTOMATIONS] Failed to process automation step ${step.id}`,
  );
};

/**
 * Finish steps and enqueue their next steps, all at once.
 *
 * If that fails, fall back to finishing them one at a time so one bad step
 * doesn't hold up the rest.
 */
const finishSteps = async (
  automationsApi: PollOptions['automationsApi'],
  steps: ReadonlyArray<AutomationStepToRun>,
): Promise<Date | null> => {
  if (steps.length === 0) {
    return null;
  }

  try {
    return await automationsApi.finishStepsAndEnqueueNext(steps);
  } catch (err) {
    logging.warn(
      { err, system: { event: 'automations.poll.batch_finish_failed', step_count: steps.length } },
      `[AUTOMATIONS] Failed to finish ${steps.length} steps at once. Finishing them one at a time`,
    );
  }

  let nextReadyAt: Date | null = null;
  for (const step of steps) {
    try {
      nextReadyAt = dateMin(nextReadyAt, await automationsApi.finishStepAndEnqueueNext(step));
    } catch (err) {
      try {
        nextReadyAt = dateMin(
          nextReadyAt,
          await handleStepExecutionFailure({ automationsApi, err, step }),
        );
      } catch (failureErr) {
        logStepFailure(failureErr, step);
      }
    }
  }
  return nextReadyAt;
};

export const poll = async ({
  automationsApi,
  enqueueAnotherPollAt,
  scheduleAutomationEmailAnalyticsJob,
  memberWelcomeEmailService,
}: Readonly<PollOptions>): Promise<void> => {
  const { steps, nextStepReadyAt } = await automationsApi.fetchAndLockSteps(MAX_STEPS_PER_BATCH);

  let nextPollAt = nextStepReadyAt;

  // tl;dr: this may enqueue 1 unnecessary poll. That's worth it.
  //
  // If the batch is full, that means one of two things:
  //
  // 1. The number of remaining steps after this batch is positive. In other
  //    words, this batch doesn't cover everything.
  // 2. The number of remaining steps after this batch is 0. In other words,
  //    this is the last batch (for now).
  //
  // With the current design, we can't tell the difference! That is suboptimal.
  //
  // We *could* fix this by doing another query. But we don't because:
  //
  // - for most batches, we'd be doing an unnecessary query
  // - unnecessary polls do not impact correctness. At worst, they are a waste
  // - it would add complexity
  if (steps.length >= MAX_STEPS_PER_BATCH) {
    nextPollAt = dateMin(nextPollAt, new Date());
  }

  const memberIds = new Set<string>();
  for (const step of steps) {
    if (step.member_id) {
      memberIds.add(step.member_id);
    }
  }
  let members: Map<string, AutomationMember>;
  try {
    members = memberIds.size > 0 ? await automationsApi.findMembers([...memberIds]) : new Map();
  } catch (err) {
    // These steps stay locked until their locks go stale, and are retried after that.
    logging.error(
      { err, system: { event: 'automations.poll.find_members_failed' } },
      `[AUTOMATIONS] Failed to load members for ${steps.length} steps`,
    );
    if (nextPollAt) {
      enqueueAnotherPollAt(nextPollAt);
    }
    return;
  }

  const stepsToFinish: AutomationStepToRun[] = [];
  const stepsByTerminalStatus = new Map<AutomationStepTerminalStatus, AutomationStepToRun[]>();

  await Promise.all(
    steps.map(async (step) => {
      try {
        const outcome = await processStep({
          automationsApi,
          member: step.member_id ? members.get(step.member_id) : undefined,
          memberWelcomeEmailService,
          scheduleAutomationEmailAnalyticsJob,
          step,
        });
        switch (outcome.type) {
          case 'finish':
            stepsToFinish.push(step);
            break;
          case 'terminal':
            stepsByTerminalStatus.set(outcome.status, [
              ...(stepsByTerminalStatus.get(outcome.status) ?? []),
              step,
            ]);
            break;
          case 'handled':
            nextPollAt = dateMin(nextPollAt, outcome.nextReadyAt);
            break;
          default: {
            const _exhaustive: never = outcome;
            throw new errors.InternalServerError({
              message: `Unexpected step outcome ${_exhaustive}`,
            });
          }
        }
      } catch (err) {
        logStepFailure(err, step);
      }
    }),
  );

  for (const [status, terminalSteps] of stepsByTerminalStatus) {
    try {
      await automationsApi.markStepsTerminal(terminalSteps, status);
    } catch (err) {
      for (const step of terminalSteps) {
        logStepFailure(err, step);
      }
    }
  }

  nextPollAt = dateMin(nextPollAt, await finishSteps(automationsApi, stepsToFinish));

  if (nextPollAt) {
    enqueueAnotherPollAt(nextPollAt);
  }
};
