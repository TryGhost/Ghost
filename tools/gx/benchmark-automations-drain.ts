#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import ObjectIdPackage from 'bson-objectid';
import type { Knex } from 'knex';
import {
  makeSmokeMailer,
  profileSmokeDrain,
  smokeAddress,
  maxSmokeRecipients,
  withSmokeDatabase,
  verifySmokeInbox,
  type SmokeMode,
} from './automations-bulk-smoke.ts';

const ObjectId = ObjectIdPackage.default;
const BATCH_SIZE = 500;
const usage =
  'Usage: pnpm gx benchmark automations-drain --numberOfRuns <positive safe integer> --steps wait,send_email [--bulkSmoke baseline|batch|worker]';

type StepType = 'wait' | 'send_email';
type Action = { id: string; revisionId: string; type: StepType };
type Options = NonNullable<ReturnType<typeof parseOptions>>;

const id = () => ObjectId().toHexString();

const lexical = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Automation benchmark email.',
            type: 'text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

export function parseOptions(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      numberOfRuns: { type: 'string' },
      steps: { type: 'string' },
      bulkSmoke: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });
  if (values.help) {
    return null;
  }
  const numberOfRuns = Number(values.numberOfRuns);
  const steps = values.steps?.split(',');
  if (
    positionals.length ||
    !values.numberOfRuns ||
    !/^[1-9]\d*$/.test(values.numberOfRuns) ||
    !Number.isSafeInteger(numberOfRuns) ||
    !steps?.length ||
    steps.length > 50 ||
    steps.some((step) => step !== 'wait' && step !== 'send_email')
  ) {
    throw new Error(usage);
  }
  const smoke = values.bulkSmoke;
  if (
    smoke !== undefined &&
    ((smoke !== 'baseline' && smoke !== 'batch' && smoke !== 'worker') ||
      (smoke === 'worker' && numberOfRuns !== 2) ||
      numberOfRuns < 2 ||
      numberOfRuns > maxSmokeRecipients ||
      steps.join(',') !== 'send_email')
  ) {
    throw new Error(
      `Bulk smoke requires one send_email step. Worker mode requires exactly 2 runs. Baseline and batch accept 2 to ${maxSmokeRecipients} runs.`,
    );
  }
  return {
    numberOfRuns,
    steps: steps as StepType[],
    ...(smoke ? { smoke: smoke as SmokeMode } : {}),
  };
}

function assertCorrectNodeEnv() {
  if (!['development', 'local'].includes(process.env.NODE_ENV || 'development')) {
    throw new Error('Benchmark requires development or local environment.');
  }
}

function setEnvironmentVariables() {
  process.env.NODE_ENV ||= 'development';
  process.env.automations__fakeWaitHoursMultiplier = '1';
  process.env.GHOST_BENCHMARK_AUTOMATIONS_DRAIN = '1';
}

// Ghost config reads environment during module loading. Keep these imports after setup.
async function loadRuntime() {
  // @ts-expect-error Ghost boot has no TypeScript declarations.
  const { default: boot } = await import('../../ghost/core/boot.js');
  await boot({ backend: false, frontend: false, server: false });

  const { default: db } = await import('../../ghost/core/server/data/db/index.js');
  const knex: Knex = db.knex;
  const { createDatabaseAutomationsRepository } =
    await import('../../ghost/core/server/services/automations/database-automations-repository.ts');
  const { poll } = await import('../../ghost/core/server/services/automations/poll.ts');
  const { toDatabaseDate } = await import('../../ghost/core/server/lib/db-types/date.ts');
  const require = createRequire(import.meta.url);
  type SendEmail = Parameters<typeof poll>[0]['memberWelcomeEmailService']['sendAutomationEmail'];
  type Service = {
    sendAutomationEmail: (
      options: Parameters<SendEmail>[0],
      mailer?: Pick<ReturnType<typeof makeSmokeMailer>, 'send'>,
    ) => ReturnType<SendEmail>;
  };
  const welcomeEmailsModule = require('../../ghost/core/server/services/member-welcome-emails') as {
    default?: { service: Service };
    service: Service;
  };
  const welcomeEmails = welcomeEmailsModule.default ?? welcomeEmailsModule;
  const repository = createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: 1 });

  return { knex, poll, toDatabaseDate, welcomeEmails, repository };
}

type Runtime = Awaited<ReturnType<typeof loadRuntime>>;

async function createMembers({
  knex,
  numberOfRuns,
  createdAt,
  address,
}: {
  knex: Knex;
  numberOfRuns: number;
  createdAt: string;
  address: (index: number) => string;
}) {
  process.stdout.write('Creating ' + numberOfRuns + ' members...');
  for (let offset = 0; offset < numberOfRuns; offset += BATCH_SIZE) {
    const members = Array.from(
      { length: Math.min(BATCH_SIZE, numberOfRuns - offset) },
      (_, index) => ({
        id: id(),
        uuid: randomUUID(),
        transient_id: randomUUID(),
        email: address(offset + index),
        status: 'free',
        enable_updates_and_announcements: true,
        created_at: createdAt,
        updated_at: createdAt,
      }),
    );
    await knex.batchInsert('members', members, BATCH_SIZE);
  }
  process.stdout.write('done.\n');
}

async function createAutomation({
  runtime: { knex },
  automationId,
  steps,
  createdAt,
  subject,
}: {
  runtime: Runtime;
  automationId: string;
  steps: StepType[];
  createdAt: string;
  subject: string;
}): Promise<Action[]> {
  const actions = steps.map((type) => ({ id: id(), revisionId: id(), type }));
  process.stdout.write('Creating 1 automation with ' + actions.length + ' steps...');
  await knex('automations').insert({
    id: automationId,
    slug: null,
    name: 'Drain benchmark ' + automationId,
    status: 'active',
    created_at: createdAt,
    updated_at: createdAt,
  });
  await knex('automation_trigger_rules').insert({
    id: id(),
    automation_id: automationId,
    trigger_type: 'free_signup',
    scope: null,
    product_id: null,
    direction: null,
    created_at: createdAt,
  });
  await knex('automation_actions').insert(
    actions.map((action) => ({
      id: action.id,
      automation_id: automationId,
      type: action.type,
      created_at: createdAt,
      updated_at: createdAt,
    })),
  );
  await knex('automation_action_revisions').insert(
    actions.map((action) => ({
      id: action.revisionId,
      action_id: action.id,
      created_at: createdAt,
      wait_hours: action.type === 'wait' ? 1 : null,
      email_subject: action.type === 'send_email' ? subject : null,
      email_lexical: action.type === 'send_email' ? lexical : null,
      email_design_setting_id: null,
    })),
  );
  if (actions.length > 1) {
    await knex('automation_action_edges').insert(
      actions.slice(1).map((action, index) => ({
        source_action_id: actions[index]!.id,
        target_action_id: action.id,
      })),
    );
  }
  process.stdout.write('done.\n');
  return actions;
}

async function createPendingRuns({
  knex,
  numberOfRuns,
  automationId,
  firstActionRevisionId,
  createdAt,
  future,
  memberPattern,
}: {
  knex: Knex;
  numberOfRuns: number;
  automationId: string;
  firstActionRevisionId: string;
  createdAt: string;
  future: string;
  memberPattern: string;
}) {
  process.stdout.write('Creating ' + numberOfRuns + ' pending automation runs...');
  let lastMemberId = '';
  for (let offset = 0; offset < numberOfRuns; offset += BATCH_SIZE) {
    const memberRows: Array<{ id: string; email: string }> = await knex('members')
      .select('id', 'email')
      .where('email', 'like', memberPattern)
      .where('id', '>', lastMemberId)
      .orderBy('id')
      .limit(BATCH_SIZE);
    if (!memberRows.length) throw new Error('Missing benchmark members during run setup.');
    lastMemberId = memberRows[memberRows.length - 1]!.id;
    const runs = memberRows.map((member) => ({
      id: id(),
      automation_id: automationId,
      member_id: member.id,
      member_email: member.email,
      created_at: createdAt,
      updated_at: createdAt,
    }));
    await knex.batchInsert('automation_runs', runs, BATCH_SIZE);
    await knex.batchInsert(
      'automation_run_steps',
      runs.map((run) => ({
        id: id(),
        automation_run_id: run.id,
        automation_action_revision_id: firstActionRevisionId,
        status: 'pending',
        ready_at: future,
        step_attempts: 0,
        created_at: createdAt,
        updated_at: createdAt,
      })),
      BATCH_SIZE,
    );
  }
  process.stdout.write('done.\n');
}

async function assertRunsHealthy(knex: Knex, automationId: string, completedStepCount: number) {
  const rows: Array<{ status: string; count: string | number }> = await knex(
    'automation_run_steps as step',
  )
    .join('automation_runs as run', 'run.id', 'step.automation_run_id')
    .where('run.automation_id', automationId)
    .groupBy('step.status')
    .select('step.status')
    .count({ count: '*' });
  const counts = new Map(rows.map((row) => [row.status, Number(row.count)]));
  const failures = [...counts].filter(([status]) => status !== 'pending' && status !== 'finished');
  if (failures.length) {
    throw new Error(
      'Automation failures: ' +
        failures.map(([status, count]) => status + ': ' + count).join(', ') +
        ' (automation ' +
        automationId +
        ')',
    );
  }
  const retry = await knex('automation_run_steps as step')
    .join('automation_runs as run', 'run.id', 'step.automation_run_id')
    .where('run.automation_id', automationId)
    .where('step.status', 'pending')
    .where('step.step_attempts', '>', 0)
    .first('step.id');
  if (retry) throw new Error('Automation step failed and was scheduled for retry: ' + retry.id);
  if (counts.get('finished') === completedStepCount) return true;
  if (!counts.get('pending')) throw new Error('Runs incomplete for automation ' + automationId);
  return false;
}

async function drainQueue({
  runtime: { knex, poll, repository, welcomeEmails, toDatabaseDate },
  automationId,
  expectedStepCount,
  smokeMailer,
}: {
  runtime: Runtime;
  automationId: string;
  expectedStepCount: number;
  smokeMailer?: ReturnType<typeof makeSmokeMailer>;
}) {
  process.stdout.write('Draining automations queue...');
  await knex('automation_run_steps')
    .whereIn(
      'automation_run_id',
      knex('automation_runs').select('id').where('automation_id', automationId),
    )
    .update({ ready_at: toDatabaseDate(new Date()) });
  const start = performance.now();
  let smokeStepsRemaining = expectedStepCount;
  const automationsApi = smokeMailer
    ? {
        ...repository,
        async fetchAndLockSteps(limit: number) {
          const result = await repository.fetchAndLockSteps(limit);
          if (result.steps.length !== Math.min(limit, smokeStepsRemaining)) {
            throw new Error('The smoke test did not claim the expected number of ready steps.');
          }
          smokeStepsRemaining -= result.steps.length;
          return result;
        },
      }
    : repository;
  while (true) {
    const nextPoll = { at: null as Date | null };
    await poll({
      automationsApi,
      memberWelcomeEmailService: smokeMailer
        ? {
            sendAutomationEmail: (options) =>
              welcomeEmails.service.sendAutomationEmail(options, smokeMailer),
          }
        : welcomeEmails.service,
      scheduleAutomationEmailAnalyticsJob: async () => {},
      enqueueAnotherPollAt: (date) => {
        if (!nextPoll.at || date < nextPoll.at) nextPoll.at = date;
      },
    });
    if (smokeMailer) {
      // All fixture steps start ready. Verify once to avoid rescanning a large cohort after every poll.
      if (smokeStepsRemaining === 0) break;
      const processed = expectedStepCount - smokeStepsRemaining;
      if (processed % 10_000 === 0)
        process.stdout.write(`\nProcessed ${processed} fixture steps.\n`);
    } else if (await assertRunsHealthy(knex, automationId, expectedStepCount)) {
      break;
    }
    const delay = Math.max(0, Math.min(1000, (nextPoll.at?.getTime() ?? Date.now()) - Date.now()));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const seconds = (performance.now() - start) / 1000;
  if (smokeMailer && !(await assertRunsHealthy(knex, automationId, expectedStepCount))) {
    throw new Error('The smoke test finished polling with incomplete runs.');
  }
  process.stdout.write('done.\n');
  return seconds;
}

async function cleanupRuns(knex: Knex, automationId: string) {
  await knex.transaction(async (trx) => {
    const runIds = () => trx('automation_runs').select('id').where('automation_id', automationId);
    await trx('automated_email_recipients')
      .whereIn(
        'automation_run_step_id',
        trx('automation_run_steps').select('id').whereIn('automation_run_id', runIds()),
      )
      .del();
    await trx('automation_run_steps').whereIn('automation_run_id', runIds()).del();
    await trx('automation_runs').where('automation_id', automationId).del();
  });
}

function printResult(numberOfRuns: number, seconds: number) {
  process.stdout.write(
    '\n' +
      numberOfRuns +
      ' automations took ' +
      seconds.toFixed(2) +
      ' seconds (' +
      (numberOfRuns / seconds).toFixed(3) +
      ' automations per second)\n',
  );
}

// Dispatch the regular poll event after both steps are ready in the disposable database.
async function runWorkerSmoke({
  runtime,
  automationId,
  subject,
}: {
  runtime: Runtime;
  automationId: string;
  subject: string;
}) {
  const { knex, toDatabaseDate } = runtime;
  const require = createRequire(import.meta.url);
  const { automationsService } =
    require('../../ghost/core/server/services/automations/index.ts') as {
      automationsService: { rescheduleAll: () => Promise<void> };
    };
  const runIds = () => knex('automation_runs').select('id').where('automation_id', automationId);
  await knex('automation_run_steps')
    .whereIn('automation_run_id', runIds())
    .update({ ready_at: toDatabaseDate(new Date()) });
  await automationsService.rescheduleAll();

  const deadline = performance.now() + 15_000;
  let finished = false;
  while (performance.now() < deadline) {
    const steps = await knex('automation_run_steps')
      .whereIn('automation_run_id', runIds())
      .select('status');
    if (steps.length === 2 && steps.every(({ status }) => status === 'finished')) {
      finished = true;
      break;
    }
    await delay(100);
  }
  if (!finished) throw new Error('The normal automation worker did not finish both steps.');

  const recipients = await knex('automated_email_recipients')
    .whereIn(
      'automation_run_step_id',
      knex('automation_run_steps').select('id').whereIn('automation_run_id', runIds()),
    )
    .select('member_email', 'automation_run_step_id', 'mailgun_message_id');
  if (
    recipients.length !== 2 ||
    !recipients.every((row) => row.mailgun_message_id?.startsWith(row.automation_run_step_id + '.'))
  ) {
    throw new Error('The normal automation worker did not record both per-recipient Mailgun IDs.');
  }
  const messagesInMailpit = await verifySmokeInbox({
    automationId,
    recipients: new Set([smokeAddress(automationId, 0), smokeAddress(automationId, 1)]),
  });
  process.stdout.write(
    JSON.stringify({ mode: 'worker', subject, messagesInMailpit, recipients }) + '\n',
  );
}

async function runBenchmark(options: Options, smokeDatabase?: string) {
  const runtime = await loadRuntime();
  if (smokeDatabase && runtime.knex.client.database() !== smokeDatabase) {
    throw new Error('The smoke test must use its disposable database.');
  }
  const automationId = id();
  const createdAt = runtime.toDatabaseDate(new Date());
  const future = runtime.toDatabaseDate(new Date(Date.now() + 86400000));
  const { numberOfRuns, steps, smoke } = options;
  const smokeMailer =
    smoke && smoke !== 'worker'
      ? makeSmokeMailer({ automationId, mode: smoke, recipientCount: numberOfRuns })
      : undefined;
  const address = (index: number) =>
    smoke ? smokeAddress(automationId, index) : `benchmark-${automationId}-${index}@example.com`;
  const subject = smoke
    ? `Automation batching smoke: ${smoke} ${automationId}`
    : 'Automation benchmark';

  try {
    await createMembers({ knex: runtime.knex, numberOfRuns, createdAt, address });
    const actions = await createAutomation({ runtime, automationId, steps, createdAt, subject });
    await createPendingRuns({
      knex: runtime.knex,
      numberOfRuns,
      automationId,
      firstActionRevisionId: actions[0]!.revisionId,
      createdAt,
      future,
      memberPattern: address(0).replace(/-0@/, '-%@'),
    });
    if (smoke === 'worker') {
      await runWorkerSmoke({ runtime, automationId, subject });
      return;
    }
    const drain = () =>
      drainQueue({
        runtime,
        automationId,
        expectedStepCount: numberOfRuns * actions.length,
        smokeMailer,
      });
    if (smokeMailer) {
      const {
        result: seconds,
        rendering,
        database,
      } = await profileSmokeDrain({ knex: runtime.knex, run: drain });
      const provider = smokeMailer.providerTiming();
      process.stdout.write(
        `Checking Mailpit for ${numberOfRuns} messages with subject "${subject}".\n`,
      );
      const result = await smokeMailer.verifyInbox();
      process.stdout.write(
        JSON.stringify({
          mode: smoke,
          subject,
          drainMs: seconds * 1000,
          ...result,
          rendering,
          database,
          provider,
        }) + '\n',
      );
    } else {
      printResult(numberOfRuns, await drain());
    }
  } finally {
    if (!smoke) await cleanupRuns(runtime.knex, automationId);
  }
}

async function main() {
  let options: Options | null;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(String(error) + '\n' + usage + '\n');
    process.exitCode = 2;
    return;
  }
  if (!options) {
    process.stdout.write(usage + '\n');
    return;
  }

  assertCorrectNodeEnv();
  setEnvironmentVariables();
  if (options.smoke)
    await withSmokeDatabase({
      run: (database) => runBenchmark(options, database),
      mode: options.smoke,
    });
  else await runBenchmark(options);
  // Boot starts background jobs; this one-shot CLI must stop them on completion.
  process.exit(0);
}

if (process.argv[1]?.endsWith('benchmark-automations-drain.ts')) {
  main().catch((error) => {
    process.stderr.write(String(error instanceof Error ? error.stack : error) + '\n');
    process.exit(1);
  });
}
