import { randomUUID } from 'node:crypto';
import ObjectIdPackage from 'bson-objectid';
import type { Knex } from 'knex';
import db from '../../data/db';
import welcomeEmails from '../member-welcome-emails';
import { createDatabaseAutomationsRepository } from './database-automations-repository';
import { buildTriggerRuleRows } from './trigger-rules';
import { poll } from './poll';
import { toDatabaseDate } from '../../lib/db-types/date';

const ObjectId = ObjectIdPackage;
const BATCH_SIZE = 500;

type StepType = 'wait' | 'send_email';
type Action = { id: string; revisionId: string; type: StepType };
type Options = { numberOfRuns: number; steps: StepType[] };

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

function loadRuntime() {
  const knex: Knex = db.knex;
  return {
    knex,
    buildTriggerRuleRows,
    poll,
    toDatabaseDate,
    welcomeEmails,
    repository: createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: 1 }),
  };
}

type Runtime = ReturnType<typeof loadRuntime>;

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
  { knex, buildTriggerRuleRows }: Runtime,
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
  await knex('automation_trigger_rules').insert(
    buildTriggerRuleRows({ automationId, scope: 'free', tierIds: [], createdAt: new Date() }),
  );
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

export async function benchmarkDrain(options: Options) {
  const runtime = loadRuntime();
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
    return {
      numberOfRuns: options.numberOfRuns,
      steps: options.steps,
      seconds,
      runsPerSecond: options.numberOfRuns / seconds,
    };
  } finally {
    await cleanupRuns(runtime.knex, automationId);
  }
}
