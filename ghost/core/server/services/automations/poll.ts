import type { AutomationStepToRun, AutomationsRepository } from './automations-repository';
import type { AutomationTriggerTierScope } from './automations-repository-2';
import { getMailgunError } from '../../lib/mailgun/mailgun-error';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import { MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES } from '../member-welcome-emails/constants';
import { MAX_ATTEMPTS, MAX_STEPS_PER_BATCH, RETRY_DELAY_MS } from './constants';
// @ts-expect-error Models currently lack type definitions.
import { Member } from '../../models';

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
  >;
  enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
  scheduleAutomationEmailAnalyticsJob: () => Promise<void>;
  memberWelcomeEmailService: MemberWelcomeEmailService;
};

const MEMBER_STATUS_BY_TRIGGER_TIER_SCOPE = new Map<AutomationTriggerTierScope, 'free' | 'paid'>([
  ['free', 'free'],
  ['all_paid', 'paid'],
  ['selected_paid', 'paid'],
]);

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

const processStep = async ({
  automationsApi,
  step,
}: Readonly<
  Pick<
    PollOptions,
    'automationsApi' | 'memberWelcomeEmailService' | 'scheduleAutomationEmailAnalyticsJob'
  > & {
    step: AutomationStepToRun;
  }
>): Promise<Date | null> => {
  if (step.automation_status !== 'active') {
    await automationsApi.markStepTerminal(step, 'automation disabled');
    return null;
  }

  if (step.step_attempts > MAX_ATTEMPTS) {
    await markMaxAttemptsExceeded(automationsApi, step);
    return null;
  }

  // NOTE: This will change once we support additional automation triggers.
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
    await automationsApi.markStepTerminal(step, 'failed');
    return null;
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
    await automationsApi.markStepTerminal(step, 'failed');
    return null;
  }

  if (!step.member_id) {
    await automationsApi.markStepTerminal(step, 'member unsubscribed');
    return null;
  }

  const memberRelationsToLoad = ['newsletters'];
  if (triggerTierScope === 'selected_paid') {
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

  const eligibleStatuses = MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES[
    memberStatus
  ] as readonly string[];
  const doesMemberStatusStillMatchAutomation =
    eligibleStatuses.includes(member.get('status') ?? '') &&
    (triggerTierScope !== 'selected_paid' ||
      member
        .related('products')
        .models.some((tier) => step.automation_trigger_tier_ids.includes(tier.id)));
  if (!doesMemberStatusStillMatchAutomation) {
    await automationsApi.markStepTerminal(step, 'member changed status');
    return null;
  }

  let nextReadyAt: Date | null = null;

  try {
    switch (step.type) {
      case 'wait':
        break;
      case 'send_email':
        // EXPERIMENT: sending is a noop so we can measure the cost of the rest of the pipeline.
        break;
      default: {
        const _exhaustive: never = step;
        throw new errors.InternalServerError({
          message: `Unexpected automation step type ${_exhaustive}`,
        });
      }
    }

    nextReadyAt = await automationsApi.finishStepAndEnqueueNext(step);
  } catch (err) {
    return await handleStepExecutionFailure({
      automationsApi,
      err,
      step,
    });
  }

  return nextReadyAt;
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

  await Promise.all(
    steps.map(async (step) => {
      try {
        const stepNextPollAt = await processStep({
          automationsApi,
          memberWelcomeEmailService,
          scheduleAutomationEmailAnalyticsJob,
          step,
        });
        nextPollAt = dateMin(nextPollAt, stepNextPollAt);
      } catch (err) {
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
        return;
      }
    }),
  );

  if (nextPollAt) {
    enqueueAnotherPollAt(nextPollAt);
  }
};
