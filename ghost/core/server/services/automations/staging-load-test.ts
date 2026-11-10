import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import config from '../../../shared/config';
import { isAutomationLoadTestSite } from '../../../shared/is-automation-load-test-site';
import { knex } from '../../data/db';
import { createDatabaseAutomationsRepository2 } from './database-automations-repository-2';
import { getReadyAtForAction } from './util/get-ready-at-for-action';
import { parseFakeWaitHoursMultiplier } from './fake-wait-hours-multiplier';

const repository = createDatabaseAutomationsRepository2({ knex });
const loadTestLabel = /^automation-load-test-([0-9a-f]{24})$/;

export async function getLoadTestAutomationId(labelId: string | undefined) {
  if (!isAutomationLoadTestSite(config) || !labelId) {
    return undefined;
  }

  const label = await knex('labels').select('slug').where('id', labelId).first();
  return loadTestLabel.exec(label?.slug ?? '')?.[1];
}

// The caller holds the member locks and has added the label in this transaction.
export async function enrollLoadTestMembers(
  trx: Knex.Transaction,
  automationId: string,
  relationIds: string[],
): Promise<boolean> {
  const actions = await repository.findFirstActionRevisions(trx, {
    eventName: 'staging_load_test',
    automationId,
  });
  const [action] = actions;
  if (!action || actions.length !== 1) {
    throw new errors.IncorrectUsageError({
      message: 'The staging load test requires an active free signup automation with a first step.',
    });
  }

  const members = await trx('members')
    .join('members_labels as relation', 'relation.member_id', 'members.id')
    .select<{ id: string; email: string }[]>('members.id', 'members.email')
    .whereIn('relation.id', relationIds)
    .where('members.status', 'free')
    .where('members.email', 'like', 'automation-load-test-%@example.com')
    .whereNotExists(
      trx('automation_runs')
        .select('id')
        .where('automation_id', automationId)
        .where('member_id', trx.ref('members.id')),
    );
  const now = new Date();
  const readyAt = getReadyAtForAction(
    action,
    now,
    parseFakeWaitHoursMultiplier(config.get('automations:fakeWaitHoursMultiplier')),
  );
  const runs = members.map((member) => ({
    id: ObjectId().toHexString(),
    automation_id: automationId,
    member_id: member.id,
    member_email: member.email,
    created_at: now,
    updated_at: now,
  }));
  await repository.insertRuns(trx, runs);
  await repository.insertRunSteps(
    trx,
    runs.map((run) => ({
      id: ObjectId().toHexString(),
      automation_run_id: run.id,
      automation_action_revision_id: action.automation_action_revision_id,
      created_at: now,
      updated_at: now,
      ready_at: readyAt,
    })),
  );
  return runs.length > 0;
}
