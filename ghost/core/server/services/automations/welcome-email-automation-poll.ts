import logging from '@tryghost/logging';
import type { Knex } from 'knex';

import * as db from '../../data/db';
import {
  MEMBER_WELCOME_EMAIL_SLUGS,
  MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES,
} from '../member-welcome-emails/constants';
// @ts-expect-error Models currently lack type definitions.
import { AutomatedEmailRecipient, Member, WelcomeEmailAutomationRun } from '../../models';

type Run = {
  id: string;
  member_id: string;
  step_attempts: number;
  next_welcome_email_automated_email_id: null | string;
  automation_slug: null | string;
  automation_status: string;
  automated_email_id: string;
};

type MemberStatus = keyof typeof MEMBER_WELCOME_EMAIL_SLUGS;

type MemberWelcomeEmailService = {
  init: () => unknown;
  api: {
    loadMemberWelcomeEmails: () => PromiseLike<unknown>;
    send: (options: {
      member: {
        name: undefined | null | string;
        email: string;
        uuid: string;
      };
      memberStatus: MemberStatus;
    }) => PromiseLike<unknown>;
  };
};

type MemberModel = {
  get(key: 'name'): undefined | null | string;
  get(key: 'email' | 'status' | 'uuid'): string;
};

type PollOptions = {
  memberWelcomeEmailService: MemberWelcomeEmailService;
  enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
};

type ExitReason =
  | 'finished'
  | 'email send failed'
  | 'member changed status'
  | 'member unsubscribed'
  | 'automation disabled';

const LOG_KEY = '[AUTOMATIONS]';
const MAX_RUNS_PER_BATCH = 100;
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const LOCK_TIMEOUT = 30 * 60 * 1000;

const isMemberStatus = (value: string): value is MemberStatus =>
  Object.hasOwn(MEMBER_WELCOME_EMAIL_SLUGS, value);

const slugToMemberStatus = new Map<string, MemberStatus>();
for (const [status, slug] of Object.entries(MEMBER_WELCOME_EMAIL_SLUGS)) {
  // This should always be true, but TypeScript doesn't know that.
  if (isMemberStatus(status)) {
    slugToMemberStatus.set(slug, status);
  }
}

const getMemberStatus = (slug: unknown): undefined | MemberStatus =>
  typeof slug === 'string' ? slugToMemberStatus.get(slug) : undefined;

async function fetchAndLockRuns(): Promise<{
  runs: Run[];
  nextFutureReadyAt: null | Date;
}> {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() - LOCK_TIMEOUT);

  return await db.knex.transaction(async (trx: Knex.Transaction) => {
    const runs = await trx<Run>('welcome_email_automation_runs as r')
      .join('automations as a', 'r.welcome_email_automation_id', 'a.id')
      .join(
        'welcome_email_automated_emails as e',
        'r.next_welcome_email_automated_email_id',
        'e.id',
      )
      .whereNotNull('r.next_welcome_email_automated_email_id')
      .where('r.ready_at', '<=', now)
      .where((builder: Knex.QueryBuilder<Record<string, unknown>, unknown[]>) => {
        builder.whereNull('r.step_started_at').orWhere('r.step_started_at', '<', lockCutoff);
      })
      .select(
        'r.id',
        'r.member_id',
        'r.step_attempts',
        'r.next_welcome_email_automated_email_id',
        'a.slug as automation_slug',
        'a.status as automation_status',
        'e.id as automated_email_id',
      )
      .limit(MAX_RUNS_PER_BATCH);

    if (runs.length === 0) {
      const result = await trx('welcome_email_automation_runs')
        .whereNotNull('next_welcome_email_automated_email_id')
        .where('ready_at', '>', now)
        .select(db.knex.raw('MIN(ready_at) as next_ready_at'))
        .first<{ next_ready_at: Date | null | string }>();
      const nextFutureReadyAt = result?.next_ready_at ? new Date(result.next_ready_at) : null;
      return { runs, nextFutureReadyAt };
    }

    const ids: string[] = [];

    for (const run of runs) {
      ids.push(run.id);
      run.step_attempts += 1;
    }

    await trx('welcome_email_automation_runs')
      .whereIn('id', ids)
      .update({
        step_started_at: now,
        step_attempts: db.knex.raw('step_attempts + 1'),
        updated_at: now,
      });

    return { runs, nextFutureReadyAt: null };
  });
}

async function updateRun(
  runId: string,
  attrs: Record<string, unknown>,
  transacting?: Knex.Transaction,
): Promise<void> {
  await WelcomeEmailAutomationRun.edit(attrs, { id: runId, transacting });
}

async function markExited(
  runId: string,
  exitReason: ExitReason,
  transacting?: Knex.Transaction,
): Promise<void> {
  await updateRun(
    runId,
    {
      next_welcome_email_automated_email_id: null,
      ready_at: null,
      step_started_at: null,
      step_attempts: 0,
      exit_reason: exitReason,
      updated_at: new Date(),
    },
    transacting,
  );
}

async function markMaxAttemptsExceeded(runId: string): Promise<void> {
  await markExited(runId, 'email send failed');
  logging.warn(
    {
      system: {
        event: 'welcome_email_automations.max_attempts',
        run_id: runId,
      },
    },
    `${LOG_KEY} Run ${runId} exceeded max attempts`,
  );
}

async function markRetry(runId: string, retryAt: Readonly<Date>): Promise<void> {
  await updateRun(runId, {
    step_started_at: null,
    ready_at: retryAt,
    updated_at: new Date(),
  });
}

async function processRun({
  run,
  memberWelcomeEmailService,
  enqueueAnotherPollAt,
}: PollOptions & { run: Run }): Promise<void> {
  if (run.step_attempts > MAX_ATTEMPTS) {
    await markMaxAttemptsExceeded(run.id);
    return;
  }

  if (run.automation_status !== 'active') {
    await markExited(run.id, 'automation disabled');
    return;
  }

  const memberStatus = getMemberStatus(run.automation_slug);
  if (!memberStatus) {
    await markExited(run.id, 'email send failed');
    logging.error(
      {
        system: {
          event: 'welcome_email_automations.unknown_slug',
          slug: run.automation_slug,
        },
      },
      `${LOG_KEY} Unknown automation slug: ${run.automation_slug}`,
    );
    return;
  }

  try {
    const member: MemberModel | null = await Member.findOne(
      { id: run.member_id },
      { withRelated: ['newsletters'] },
    );

    // When a member is deleted, the run is cascade-deleted. In this edge
    // case, when a member is deleted after the run is loaded but before
    // it's processed, bail. (There's no run to update any longer.)
    if (!member) {
      logging.warn(
        {
          system: {
            event: 'welcome_email_automations.member_not_found',
            run_id: run.id,
          },
        },
        `${LOG_KEY} Member not found for run ${run.id}`,
      );
      return;
    }

    const eligibleStatuses: readonly string[] =
      MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES[memberStatus];
    if (!eligibleStatuses.includes(member.get('status'))) {
      await markExited(run.id, 'member changed status');
      return;
    }

    await memberWelcomeEmailService.api.send({
      member: {
        name: member.get('name'),
        email: member.get('email'),
        uuid: member.get('uuid'),
      },
      memberStatus,
    });

    await db.knex.transaction(async (transacting: Knex.Transaction) => {
      await AutomatedEmailRecipient.add(
        {
          member_id: run.member_id,
          automated_email_id: run.automated_email_id,
          member_uuid: member.get('uuid'),
          member_email: member.get('email'),
          member_name: member.get('name'),
          track_opens: false,
          track_clicks: false,
        },
        { transacting },
      );

      await markExited(run.id, 'finished', transacting);
    });
  } catch (err) {
    logging.error(
      {
        system: {
          event: 'welcome_email_automations.send_failed',
          run_id: run.id,
        },
        err,
      },
      `${LOG_KEY} Failed to send welcome email for run ${run.id}`,
    );

    if (run.step_attempts < MAX_ATTEMPTS) {
      const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
      await markRetry(run.id, retryAt);
      enqueueAnotherPollAt(retryAt);
    } else {
      await markMaxAttemptsExceeded(run.id);
    }
  }
}

/**
 * Run automations that need it.
 *
 * Runs up to 100 in a batch. If that's met or exceeded, a request to poll
 * again is dispatched.
 */
export async function welcomeEmailAutomationPoll(options: PollOptions): Promise<void> {
  const { memberWelcomeEmailService, enqueueAnotherPollAt } = options;
  const { runs, nextFutureReadyAt } = await fetchAndLockRuns();

  if (runs.length === 0) {
    if (nextFutureReadyAt) {
      enqueueAnotherPollAt(nextFutureReadyAt);
    }
    return;
  }

  memberWelcomeEmailService.init();
  await memberWelcomeEmailService.api.loadMemberWelcomeEmails();

  await Promise.allSettled(runs.map((run) => processRun({ run, ...options })));

  // If the batch is full, we might have another batch to execute. (There's
  // no way to know without trying.)
  if (runs.length >= MAX_RUNS_PER_BATCH) {
    enqueueAnotherPollAt(new Date());
  }
}
