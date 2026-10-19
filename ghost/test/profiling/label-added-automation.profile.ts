/**
 * Profiles "label added" automations with lots of members.
 *
 * This is not part of the normal test suites. Run it manually against MySQL:
 *
 *     cd ghost
 *     PROFILE_MEMBER_COUNT=1000000 pnpm exec vitest run -c vitest.config.db.ts \
 *       --project profiling test/profiling/label-added-automation.profile.ts
 *
 * It boots Ghost, inserts members, activates a "label added" automation, adds
 * the label to every member with the Admin API's bulk endpoint, then measures
 * how long it takes to enter members into the automation and to run the first
 * step for all of them.
 */
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { setTimeout as sleep } from 'node:timers/promises';
// @ts-expect-error This module lacks type definitions.
import models from '../../core/server/models';
import * as automationsApi from '../../core/server/services/automations/automations-api';
import { agentProvider, fixtureManager, mockManager } from '../utils/e2e-framework';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../utils/config-utils';

const MEMBER_COUNT = Number(process.env.PROFILE_MEMBER_COUNT);
const INSERT_BATCH_SIZE = 50_000;

const db: Knex = models.Base.knex;

const log = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(`[profile ${new Date().toISOString()}] ${message}`);
};

const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  log(`${label}: ${((performance.now() - start) / 1000).toFixed(1)}s`);
  return result;
};

const count = async (query: Knex.QueryBuilder): Promise<number> => {
  const row = await query.count({ count: '*' }).first();
  return Number(row?.count ?? 0);
};

describe.skipIf(!MEMBER_COUNT)('Profile: label added automations', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'newsletters');
    await agent.loginAsOwner();
    mockManager.mockLabsEnabled('automations');
    // Tests send automation emails, but this profile measures the "real" no-op.
    configUtils.set('automations:sendEmailNoop', true);
  });

  it(`enters ${MEMBER_COUNT} members and drains the queue`, async function () {
    await time(`Insert ${MEMBER_COUNT} members`, async () => {
      await db.raw('SET SESSION cte_max_recursion_depth = ?', [INSERT_BATCH_SIZE + 1]);
      for (let offset = 0; offset < MEMBER_COUNT; offset += INSERT_BATCH_SIZE) {
        const size = Math.min(INSERT_BATCH_SIZE, MEMBER_COUNT - offset);
        await db.raw(
          `INSERT INTO members (id, uuid, transient_id, email, status, enable_updates_and_announcements, created_at)
           WITH RECURSIVE seq (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < ?)
           SELECT CONCAT('aaaa', LPAD(LOWER(HEX(n + ?)), 20, '0')), UUID(), UUID(), CONCAT('profile', n + ?, '@example.com'), 'free', 1, NOW()
           FROM seq`,
          [size - 1, offset, offset],
        );
      }
    });

    const labelResponse = await agent
      .post('labels/')
      .body({ labels: [{ name: 'VIP' }] })
      .expectStatus(201);
    const labelId: string = labelResponse.body.labels[0].id;

    const emailId = ObjectId().toHexString();
    const waitId = ObjectId().toHexString();
    const automationResponse = await agent
      .post('automations/')
      .body({
        automations: [
          {
            name: 'VIP welcome',
            description: '',
            status: 'inactive',
            trigger_type: 'label_added',
            trigger_label_ids: [labelId],
            actions: [
              {
                id: emailId,
                type: 'send_email',
                data: {
                  email_subject: 'Welcome, VIP',
                  email_lexical: JSON.stringify({
                    root: {
                      type: 'root',
                      version: 1,
                      direction: null,
                      format: '',
                      indent: 0,
                      children: [
                        {
                          type: 'paragraph',
                          version: 1,
                          direction: null,
                          format: '',
                          indent: 0,
                          textFormat: 0,
                          textStyle: '',
                          children: [
                            {
                              type: 'text',
                              version: 1,
                              detail: 0,
                              format: 0,
                              mode: 'normal',
                              style: '',
                              text: 'Hello!',
                            },
                          ],
                        },
                      ],
                    },
                  }),
                  email_design_setting_id: 'default-automated-email',
                },
              },
              { id: waitId, type: 'wait', data: { wait_hours: 24 } },
            ],
            edges: [{ source_action_id: emailId, target_action_id: waitId }],
          },
        ],
      })
      .expectStatus(201);
    const automation = automationResponse.body.automations[0];
    await agent
      .put(`automations/${automation.id}/`)
      .body({ automations: [{ ...automation, status: 'active' }] })
      .expectStatus(200);

    // Labels added in the same second as activation still count, but make the
    // timing clearer by waiting.
    await sleep(1100);

    await time(`Add label to ${MEMBER_COUNT} members (PUT /members/bulk)`, async () => {
      await agent
        .put('members/bulk/?all=true')
        .body({ bulk: { action: 'addLabel', meta: { label: { id: labelId } } } })
        .expectStatus(200);
    });

    // InnoDB recalculates index statistics in the background after big
    // changes. Do it now so query plans match a steady-state site.
    await time('Analyze tables', () =>
      db.raw('ANALYZE TABLE members, members_labels, automation_runs, automation_run_steps'),
    );

    // Normally this runs every 15 minutes. Run it now instead of waiting.
    const enqueueStart = performance.now();
    await time('Enter members into the automation (enqueueLabelAddedRuns)', () =>
      automationsApi.enqueueLabelAddedRuns(),
    );
    const runCount = await count(db('automation_runs').where('automation_id', automation.id));
    log(`Runs created: ${runCount}`);

    // The service's own poll loop drains the queue. Watch it.
    const drainStart = performance.now();
    let lastFinished = 0;
    while (true) {
      const finished = await count(
        db('automation_run_steps as step')
          .innerJoin('automation_runs as run', 'run.id', 'step.automation_run_id')
          .where('run.automation_id', automation.id)
          .whereNot('step.status', 'pending'),
      );
      const elapsed = (performance.now() - drainStart) / 1000;
      log(
        `Drain: ${finished}/${runCount} first steps finished after ${elapsed.toFixed(0)}s (${((finished - lastFinished) / 2).toFixed(0)}/s)`,
      );
      lastFinished = finished;
      if (finished >= runCount) {
        break;
      }
      await sleep(2000);
    }
    log(
      `Total from enqueue start to drained: ${((performance.now() - enqueueStart) / 1000).toFixed(1)}s`,
    );

    const statuses = await db('automation_run_steps')
      .select('status')
      .count({ count: '*' })
      .groupBy('status');
    log(`Step statuses: ${JSON.stringify(statuses)}`);
  });
});
