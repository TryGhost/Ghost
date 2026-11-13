#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import ObjectIdPackage from 'bson-objectid';
import type { Knex } from 'knex';

const ObjectId = ObjectIdPackage.default;
const BATCH_SIZE = 500;
const usage =
  'Usage: pnpm gx benchmark automations-drain --numberOfRuns <positive safe integer> --steps wait,send_email';

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
  return { numberOfRuns, steps: steps as StepType[] };
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
  const { bootGhost } = await import('../../ghost/core/boot.js');
  await bootGhost({ backend: false, frontend: false, server: false });

  const { default: db } = await import('../../ghost/core/server/data/db/index.js');
  const knex: Knex = db.knex;
  const { createDatabaseAutomationsRepository } =
    await import('../../ghost/core/server/services/automations/database-automations-repository.ts');
  const { poll } = await import('../../ghost/core/server/services/automations/poll.ts');
  const { toDatabaseDate } = await import('../../ghost/core/server/lib/db-types/date.ts');
  const require = createRequire(import.meta.url);
  const welcomeEmailsModule = require('../../ghost/core/server/services/member-welcome-emails') as {
    default?: { service: Parameters<typeof poll>[0]['memberWelcomeEmailService'] };
    service: Parameters<typeof poll>[0]['memberWelcomeEmailService'];
  };
  const welcomeEmails = welcomeEmailsModule.default ?? welcomeEmailsModule;
  const repository = createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: 1 });

  return { knex, poll, toDatabaseDate, welcomeEmails, repository };
}

type Runtime = Awaited<ReturnType<typeof loadRuntime>>;

async function createMembers(
  knex: Knex,
  numberOfRuns: number,
  automationId: string,
  createdAt: string,
) {
  process.stdout.write('Creating ' + numberOfRuns + ' members...');
  for (let offset = 0; offset < numberOfRuns; offset += BATCH_SIZE) {
    const members = Array.from(
      { length: Math.min(BATCH_SIZE, numberOfRuns - offset) },
      (_, index) => ({
        id: id(),
        uuid: randomUUID(),
        transient_id: randomUUID(),
        email: 'benchmark-' + automationId + '-' + (offset + index) + '@example.com',
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

async function createAutomation(
  { knex }: Runtime,
  automationId: string,
  steps: StepType[],
  createdAt: string,
): Promise<Action[]> {
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
      email_subject: action.type === 'send_email' ? 'Automation benchmark' : null,
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

async function createPendingRuns(
  knex: Knex,
  numberOfRuns: number,
  automationId: string,
  firstActionRevisionId: string,
  createdAt: string,
  future: string,
) {
  process.stdout.write('Creating ' + numberOfRuns + ' pending automation runs...');
  let lastMemberId = '';
  for (let offset = 0; offset < numberOfRuns; offset += BATCH_SIZE) {
    const memberRows: Array<{ id: string; email: string }> = await knex('members')
      .select('id', 'email')
      .where('email', 'like', 'benchmark-' + automationId + '-%@example.com')
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

async function drainQueue(
  { knex, poll, repository, welcomeEmails, toDatabaseDate }: Runtime,
  automationId: string,
  expectedStepCount: number,
) {
  process.stdout.write('Draining automations queue...');
  await knex('automation_run_steps')
    .whereIn(
      'automation_run_id',
      knex('automation_runs').select('id').where('automation_id', automationId),
    )
    .update({ ready_at: toDatabaseDate(new Date()) });
  const start = performance.now();
  while (true) {
    const nextPoll = { at: null as Date | null };
    await poll({
      automationsApi: repository,
      memberWelcomeEmailService: welcomeEmails.service,
      scheduleAutomationEmailAnalyticsJob: async () => {},
      enqueueAnotherPollAt: (date) => {
        if (!nextPoll.at || date < nextPoll.at) nextPoll.at = date;
      },
    });
    if (await assertRunsHealthy(knex, automationId, expectedStepCount)) break;
    const delay = Math.max(0, Math.min(1000, (nextPoll.at?.getTime() ?? Date.now()) - Date.now()));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const seconds = (performance.now() - start) / 1000;
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
  const runtime = await loadRuntime();
  const automationId = id();
  const createdAt = runtime.toDatabaseDate(new Date());
  const future = runtime.toDatabaseDate(new Date(Date.now() + 86400000));

  try {
    await createMembers(runtime.knex, options.numberOfRuns, automationId, createdAt);
    const actions = await createAutomation(runtime, automationId, options.steps, createdAt);
    await createPendingRuns(
      runtime.knex,
      options.numberOfRuns,
      automationId,
      actions[0]!.revisionId,
      createdAt,
      future,
    );
    const seconds = await drainQueue(runtime, automationId, options.numberOfRuns * actions.length);
    printResult(options.numberOfRuns, seconds);
  } finally {
    await cleanupRuns(runtime.knex, automationId);
  }
  // Boot starts background jobs; this one-shot CLI must stop them on completion.
  process.exit(0);
}

if (process.argv[1]?.endsWith('benchmark-automations-drain.ts')) {
  main().catch((error) => {
    process.stderr.write(String(error instanceof Error ? error.stack : error) + '\n');
    process.exit(1);
  });
}
