import type { AutomationTriggerRuleDefinition } from './trigger-rules';
import type {
  AutomationStepToRun,
  AutomationsRepository,
  RecordEmailSentOptions,
} from './automations-repository';
import { getMailgunMessageId } from '../../lib/mailgun/mailgun-message-id';
import { getMailgunError } from '../../lib/mailgun/mailgun-error';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import { MAX_ATTEMPTS, MAX_STEPS_PER_BATCH, RETRY_DELAY_MS } from './constants';
// @ts-expect-error Models currently lack type definitions.
import { Member } from '../../models';

const settingsCache = require('../../../shared/settings-cache');

type AutomationEmail = {
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
};

type MemberWelcomeEmailService = {
  sendAutomationEmail: (options: AutomationEmail) => Promise<unknown>;
  sendAutomationEmails?: (emails: AutomationEmail[]) => Promise<PromiseSettledResult<unknown>[]>;
};

type MemberModel = {
  get(key: 'name'): string | null;
  get(key: 'email' | 'status' | 'uuid'): string;
  get(key: 'enable_updates_and_announcements'): boolean | null;
  related(key: 'newsletters'): {
    models: unknown[];
  };
  related(key: 'products'): {
    models: { id: string }[];
  };
};

type PollOptions = {
  automationsApi: Pick<
    AutomationsRepository,
    | 'fetchAndLockSteps'
    | 'finishStepAndEnqueueNext'
    | 'markStepTerminal'
    | 'recordEmailSent'
    | 'retryStep'
  > &
    Partial<Pick<AutomationsRepository, 'recordEmailsSent' | 'finishStepsAndEnqueueNext'>>;
  enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
  scheduleAutomationEmailAnalyticsJob: () => Promise<void>;
  memberWelcomeEmailService: MemberWelcomeEmailService;
};

const getFreeOrPaidForTriggerRule = (
  rule: Readonly<AutomationTriggerRuleDefinition>,
): 'free' | 'paid' => {
  const triggerType = rule.trigger_type;
  switch (triggerType) {
    case 'free_signup':
      return 'free';
    case 'paid_subscription_started':
      return 'paid';
    case 'paid_subscription_changed':
      return rule.scope === 'free' ? 'free' : 'paid';
    default: {
      const _exhaustive: never = triggerType;
      throw new errors.InternalServerError({
        message: `Unexpected automation trigger type: ${_exhaustive}`,
      });
    }
  }
};

const doesMemberMatchTriggerRuleStatus = (
  member: MemberModel,
  rule: Readonly<AutomationTriggerRuleDefinition>,
): boolean => {
  const expectedFreeOrPaid = getFreeOrPaidForTriggerRule(rule);
  const actualMemberStatus = member.get('status');
  switch (expectedFreeOrPaid) {
    case 'free':
      if (actualMemberStatus !== 'free') {
        return false;
      }
      break;
    case 'paid':
      if (actualMemberStatus !== 'paid' && actualMemberStatus !== 'gift') {
        return false;
      }
      break;
    default: {
      const _exhaustive: never = expectedFreeOrPaid;
      throw new errors.InternalServerError({
        message: `Unexpected expected member status: ${_exhaustive}`,
      });
    }
  }

  return true;
};

const doesMemberMatchTriggerRuleScope = (
  member: MemberModel,
  rule: Readonly<AutomationTriggerRuleDefinition>,
): boolean => {
  switch (rule.scope) {
    case null:
    case 'any_paid_tier':
    case 'free':
      return true;
    case 'specific_paid_tier':
      return member.related('products').models.some((tier) => tier.id === rule.product_id);
    default: {
      const _exhaustive: never = rule;
      throw new errors.InternalServerError({ message: `Unexpected rule: ${_exhaustive}` });
    }
  }
};

/**
 * Does this user have automation emails enabled?
 *
 * Should only be called if the `newsletters` relation is loaded.
 */
const hasUpdatesAndAnnouncementsEnabled = (member: MemberModel): boolean => {
  const preference = member.get('enable_updates_and_announcements');

  if (preference !== null) {
    return preference;
  }

  const isSubscribedToAnyNewsletters = member.related('newsletters').models.length > 0;
  return isSubscribedToAnyNewsletters;
};

const markMaxAttemptsExceeded = async (
  automationsApi: PollOptions['automationsApi'],
  step: AutomationStepToRun,
): Promise<void> => {
  await automationsApi.markStepTerminal(step, 'failed');
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
    await markMaxAttemptsExceeded(automationsApi, step);
  }

  return null;
};

type PreparedStep =
  | { email?: undefined }
  | { email: AutomationEmail; deliveryRecord: (result: unknown) => RecordEmailSentOptions };

const prepareStep = async ({
  automationsApi,
  step,
}: Readonly<{
  automationsApi: PollOptions['automationsApi'];
  step: AutomationStepToRun;
}>): Promise<PreparedStep | null> => {
  if (step.automation_status !== 'active') {
    await automationsApi.markStepTerminal(step, 'automation disabled');
    return null;
  }

  if (step.step_attempts > MAX_ATTEMPTS) {
    await markMaxAttemptsExceeded(automationsApi, step);
    return null;
  }

  const memberId = step.member_id;
  if (!memberId) {
    await automationsApi.markStepTerminal(step, 'member unsubscribed');
    return null;
  }

  // For paid_subscription_changed triggers, only the destination rules determine whether the run continues.
  // Other trigger types have no 'from' rules, so this filter leaves them unchanged.
  const rulesToCheck = step.automation_trigger_rules.filter((rule) => rule.direction !== 'from');

  const memberRelationsToLoad: string[] = [];
  if (step.type === 'send_email') {
    memberRelationsToLoad.push('newsletters');
  }
  if (rulesToCheck.some((rule) => rule.scope === 'specific_paid_tier')) {
    memberRelationsToLoad.push('products');
  }
  const member = (await Member.findOne(
    { id: step.member_id },
    { withRelated: memberRelationsToLoad },
  )) as MemberModel | null;

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
    await automationsApi.markStepTerminal(step, 'member unsubscribed');
    return null;
  }

  // The member exists, but do they still match the trigger rules for this automation?
  let matchingRule: (typeof rulesToCheck)[number] | undefined;
  let stillMatchesStatus = false;
  for (const rule of rulesToCheck) {
    if (!doesMemberMatchTriggerRuleStatus(member, rule)) {
      continue;
    }
    stillMatchesStatus = true;
    if (doesMemberMatchTriggerRuleScope(member, rule)) {
      matchingRule = rule;
      break;
    }
  }
  if (!matchingRule) {
    await automationsApi.markStepTerminal(
      step,
      stillMatchesStatus ? 'member changed tier' : 'member changed status',
    );
    return null;
  }

  if (step.type === 'wait') {
    return {};
  }
  if (!hasUpdatesAndAnnouncementsEnabled(member)) {
    await automationsApi.markStepTerminal(step, 'member unsubscribed');
    return null;
  }

  const trackClicks = Boolean(settingsCache.get('email_track_clicks'));
  const trackOpens = Boolean(settingsCache.get('email_track_opens'));
  const email: AutomationEmail = {
    email: {
      designSettingId: step.email_design_setting_id,
      lexical: step.email_lexical,
      subject: step.email_subject,
    },
    member: {
      // Note that we don't use `automation_run.member_email` here. That's only for the historical record, not for functionality.
      email: member.get('email'),
      name: member.get('name'),
      uuid: member.get('uuid'),
    },
    memberStatus: getFreeOrPaidForTriggerRule(matchingRule),
    trackOpens,
    trackClicks,
    automationActionRevisionId: step.automation_action_revision_id,
    automationRunStepId: step.id,
  };

  return {
    email,
    deliveryRecord: (result) => {
      const mailgunMessageId = getMailgunMessageId(result);
      return {
        automationActionRevisionId: email.automationActionRevisionId,
        automationRunStepId: step.id,
        ...(mailgunMessageId ? { mailgunMessageId } : {}),
        memberEmail: email.member.email,
        memberId,
        memberName: email.member.name,
        memberUuid: email.member.uuid,
        trackClicks,
        trackOpens: trackOpens && Boolean(mailgunMessageId),
      };
    },
  };
};

async function recordSingleEmail(
  automationsApi: PollOptions['automationsApi'],
  record: RecordEmailSentOptions,
) {
  try {
    await automationsApi.recordEmailSent(record);
  } catch (err) {
    logging.error(
      {
        err,
        system: {
          event: 'automations.poll.recipient_persistence_failed',
          member_id: record.memberId,
          step_id: record.automationRunStepId,
        },
      },
      `[AUTOMATIONS] Failed to record automated email recipient for step ${record.automationRunStepId}`,
    );
  }
}

async function scheduleEmailAnalytics(
  schedule: PollOptions['scheduleAutomationEmailAnalyticsJob'],
  record: RecordEmailSentOptions,
) {
  try {
    await schedule();
  } catch (err) {
    logging.error(
      {
        err,
        system: {
          event: 'automations.poll.analytics_scheduling_failed',
          member_id: record.memberId,
          step_id: record.automationRunStepId,
        },
      },
      `[AUTOMATIONS] Failed to schedule email analytics job for step ${record.automationRunStepId}`,
    );
  }
}

const dateMin = (a: Date | null, b: Date | null): Date | null => {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a < b ? a : b;
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

  const noteNextPollAt = (date: Date | null) => {
    nextPollAt = dateMin(nextPollAt, date);
  };
  const runStep = async <T>(
    step: AutomationStepToRun,
    run: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      return await run();
    } catch (err) {
      try {
        noteNextPollAt(await handleStepExecutionFailure({ automationsApi, err, step }));
      } catch (retryError) {
        logging.error(
          { err: retryError, system: { event: 'automations.poll.step_failed', step_id: step.id } },
          `[AUTOMATIONS] Failed to process automation step ${step.id}`,
        );
      }
      return null;
    }
  };

  const sendBatch = memberWelcomeEmailService.sendAutomationEmails?.bind(memberWelcomeEmailService);
  const individualWork: Promise<unknown>[] = [];
  const readyEmails = (
    await Promise.all(
      steps.map(async (step) => {
        let prepared;
        try {
          prepared = await prepareStep({ automationsApi, step });
        } catch (err) {
          logging.error(
            { err, system: { event: 'automations.poll.step_failed', step_id: step.id } },
            `[AUTOMATIONS] Failed to prepare automation step ${step.id}`,
          );
          return null;
        }
        if (!prepared) {
          return null;
        }
        if (prepared.email && step.step_attempts === 1 && sendBatch) {
          return { ...prepared, step };
        }
        individualWork.push(
          runStep(step, async () => {
            if (prepared.email) {
              const result = await memberWelcomeEmailService.sendAutomationEmail(prepared.email);
              const record = prepared.deliveryRecord(result);
              await recordSingleEmail(automationsApi, record);
              if (record.mailgunMessageId) {
                await scheduleEmailAnalytics(scheduleAutomationEmailAnalyticsJob, record);
              }
            }
            noteNextPollAt(await automationsApi.finishStepAndEnqueueNext(step));
          }),
        );
        return null;
      }),
    )
  ).filter((item) => item !== null);

  if (sendBatch && readyEmails.length > 0) {
    const results = await sendBatch(readyEmails.map(({ email }) => email)).catch(
      (reason: unknown) => readyEmails.map(() => ({ status: 'rejected' as const, reason })),
    );
    const sent: { step: AutomationStepToRun; record: RecordEmailSentOptions }[] = [];
    for (const [index, { step, deliveryRecord }] of readyEmails.entries()) {
      const result = results[index]!;
      if (result.status === 'rejected') {
        individualWork.push(
          runStep(step, async () => {
            throw result.reason;
          }),
        );
      } else {
        sent.push({ step, record: deliveryRecord(result.value) });
      }
    }

    if (sent.length > 1 && automationsApi.recordEmailsSent) {
      try {
        await automationsApi.recordEmailsSent(sent.map(({ record }) => record));
      } catch (err) {
        logging.error(
          { err, system: { event: 'automations.poll.recipient_persistence_failed' } },
          '[AUTOMATIONS] Failed to record sent automation emails',
        );
      }
    } else {
      await Promise.all(sent.map(({ record }) => recordSingleEmail(automationsApi, record)));
    }
    const tracked = sent.find(({ record }) => record.mailgunMessageId);
    if (tracked) {
      await scheduleEmailAnalytics(scheduleAutomationEmailAnalyticsJob, tracked.record);
    }
    const sentSteps = sent.map(({ step }) => step);
    if (sentSteps.length > 1 && automationsApi.finishStepsAndEnqueueNext) {
      try {
        noteNextPollAt(await automationsApi.finishStepsAndEnqueueNext(sentSteps));
        sentSteps.length = 0;
      } catch (err) {
        logging.error(
          { err, system: { event: 'automations.poll.grouped_completion_failed' } },
          '[AUTOMATIONS] Failed to complete sent automation steps together',
        );
      }
    }
    // A failed grouped transaction only falls back to completing the steps.
    // Delivery and recipient recording already ran.
    await Promise.all(
      sentSteps.map((step) =>
        runStep(step, async () => {
          noteNextPollAt(await automationsApi.finishStepAndEnqueueNext(step));
        }),
      ),
    );
  }
  await Promise.all(individualWork);

  if (nextPollAt) {
    enqueueAnotherPollAt(nextPollAt);
  }
};
