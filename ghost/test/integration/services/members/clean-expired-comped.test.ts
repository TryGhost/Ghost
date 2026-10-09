import assert from 'node:assert/strict';
import sinon from 'sinon';
import CleanExpiredCompedJob from '../../../../core/server/services/members/jobs/clean-expired-comped-job';

const moment = require('moment');
const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const db = require('../../../../core/server/data/db');
const events = require('../../../../core/server/lib/common/events');
const { getInstance: getJobsService } = require('../../../../core/server/services/jobs-service');

async function waitFor(
  check: () => Promise<boolean>,
  { timeoutMs = 5000, intervalMs = 25 } = {},
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  return false;
}

// Datetimes are inserted in the cross-dialect 'YYYY-MM-DD HH:mm:ss' format the
// models use, so the job's UTC-day boundary comparison behaves as in production.
function daysFromNow(days: number): string {
  return moment.utc().add(days, 'days').format('YYYY-MM-DD HH:mm:ss');
}

describe('Job: Clean expired comped', function () {
  let paidTierId: string;
  const memberIds: string[] = [];

  async function createCompedMember(email: string, expiryAt: string): Promise<string> {
    const member = await models.Member.add({
      email,
      name: email,
      status: 'comped',
      email_disabled: false,
    });
    memberIds.push(member.id);

    await db.knex('members_products').insert({
      id: ObjectId().toHexString(),
      member_id: member.id,
      product_id: paidTierId,
      sort_order: 0,
      expiry_at: expiryAt,
    });

    return member.id;
  }

  async function compedToFreeEvents(memberId: string): Promise<any[]> {
    return db
      .knex('members_status_events')
      .where({ member_id: memberId, from_status: 'comped', to_status: 'free' })
      .select('*');
  }

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    const paidTier = await models.Product.findOne({ type: 'paid' }, { require: true });
    paidTierId = paidTier.id;
  });

  afterAll(async function () {
    await db.knex('members_products').whereIn('member_id', memberIds).del();
    await db.knex('members_status_events').whereIn('member_id', memberIds).del();
    await db.knex('members').whereIn('id', memberIds).del();
  });

  it('cleans up expired comped members exactly once and leaves the rest alone', async function () {
    const expiredMemberId = await createCompedMember('expired-comped@example.com', daysFromNow(-2));
    const activeMemberId = await createCompedMember('active-comped@example.com', daysFromNow(2));
    // Eligibility is strictly before the start of the current UTC day, so an
    // expiry later today must survive - pins the cutoff's cross-dialect
    // format (an ISO cutoff string wrongly matches this row on SQLite)
    const sameDayMemberId = await createCompedMember(
      'same-day-comped@example.com',
      moment.utc().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
    );

    const editedEvents: any[] = [];
    const onMemberEdited = (model: any) => {
      editedEvents.push(model);
    };
    events.on('member.edited', onMemberEdited);

    // Installed before the first dispatch and consulted by count, so the
    // repeat-run wait below cannot be satisfied by the first run's straggler
    // completion log (the task emits events before it logs completion)
    const loggingInfoSpy = sinon.spy(logging, 'info');
    const completedLogCount = () =>
      loggingInfoSpy
        .getCalls()
        .filter((call) => call.args[0]?.system?.event === 'clean_expired_comped.completed').length;

    try {
      await getJobsService().dispatch(new CleanExpiredCompedJob());

      const cleaned = await waitFor(async () => {
        const member = await models.Member.findOne({ id: expiredMemberId });
        return member.get('status') === 'free';
      });
      assert.ok(cleaned, 'The dispatched job moves the expired comped member to free');

      const expiredRelations = await db
        .knex('members_products')
        .where({ member_id: expiredMemberId });
      assert.equal(expiredRelations.length, 0, 'The expired product relation is deleted');

      const statusEvents = await compedToFreeEvents(expiredMemberId);
      assert.equal(statusEvents.length, 1, 'Exactly one comped->free status event is recorded');

      // The model event is emitted after the database work, so wait for it too
      const eventEmitted = await waitFor(async () => {
        return editedEvents.some((model) => model.id === expiredMemberId);
      });
      assert.ok(eventEmitted, 'A member.edited model event is emitted for the changed member');
      const emittedModel = editedEvents.find((model) => model.id === expiredMemberId);
      assert.equal(emittedModel._previousAttributes.status, 'comped');
      assert.equal(emittedModel._changed.status, 'free');

      const activeMember = await models.Member.findOne({ id: activeMemberId });
      assert.equal(activeMember.get('status'), 'comped', 'A future expiry is left alone');
      const activeRelations = await db
        .knex('members_products')
        .where({ member_id: activeMemberId });
      assert.equal(activeRelations.length, 1, 'The unexpired product relation is kept');

      const sameDayMember = await models.Member.findOne({ id: sameDayMemberId });
      assert.equal(
        sameDayMember.get('status'),
        'comped',
        'An expiry later on the current UTC day is not yet eligible',
      );
      const sameDayRelations = await db
        .knex('members_products')
        .where({ member_id: sameDayMemberId });
      assert.equal(sameDayRelations.length, 1, 'The same-day product relation is kept');

      const firstRunLogged = await waitFor(async () => completedLogCount() === 1);
      assert.ok(firstRunLogged, 'The first run logs its completion event');

      // A repeat run must be a no-op: no duplicate status history, no new events
      editedEvents.length = 0;
      await getJobsService().dispatch(new CleanExpiredCompedJob());
      const repeatCompleted = await waitFor(async () => completedLogCount() === 2);
      assert.ok(repeatCompleted, 'The repeat run finishes and logs its completion event');

      const statusEventsAfterRepeat = await compedToFreeEvents(expiredMemberId);
      assert.equal(statusEventsAfterRepeat.length, 1, 'A repeat run adds no status history');
      assert.equal(
        editedEvents.filter((model) => model.id === expiredMemberId).length,
        0,
        'A repeat run emits no further model events',
      );
      const activeMemberAfterRepeat = await models.Member.findOne({ id: activeMemberId });
      assert.equal(activeMemberAfterRepeat.get('status'), 'comped');
    } finally {
      loggingInfoSpy.restore();
      events.removeListener('member.edited', onMemberEdited);
    }
  });

  it('does not change a member who is no longer comped when their relation expires', async function () {
    const memberId = await createCompedMember('paid-since-comped@example.com', daysFromNow(-2));
    await db.knex('members').where({ id: memberId }).update({ status: 'paid' });

    await getJobsService().dispatch(new CleanExpiredCompedJob());

    const relationDeleted = await waitFor(async () => {
      const relations = await db.knex('members_products').where({ member_id: memberId });
      return relations.length === 0;
    });
    assert.ok(relationDeleted, 'The expired product relation is still deleted');

    const member = await models.Member.findOne({ id: memberId });
    assert.equal(member.get('status'), 'paid', 'A member who is not comped keeps their status');

    const statusEvents = await compedToFreeEvents(memberId);
    assert.equal(statusEvents.length, 0, 'No status event is recorded for a non-comped member');
  });

  // The migration's core safety claim is that the delete, member update and
  // status-event insert commit or roll back together. This exercises a real
  // database transaction that fails on its last write and proves nothing
  // else stuck.
  it('rolls back every write when the transaction fails part-way', async function () {
    const cleanExpiredComped =
      require('../../../../core/server/services/members/jobs/clean-expired-comped-task').default;
    const memberId = await createCompedMember('rollback-comped@example.com', daysFromNow(-2));

    const realKnex = db.knex;
    const failingDb = {
      knex: {
        transaction: (callback: (trx: unknown) => unknown) =>
          realKnex.transaction((trx: unknown) => {
            const proxied = new Proxy(trx as object, {
              apply(target, thisArg, args: unknown[]) {
                if (args[0] === 'members_status_events') {
                  return {
                    insert: () => Promise.reject(new Error('forced mid-transaction failure')),
                  };
                }
                return Reflect.apply(target as (...a: unknown[]) => unknown, thisArg, args);
              },
            });
            return callback(proxied);
          }),
      },
    };

    const stubLogging = { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    const stubSentry = { captureException: sinon.stub() };
    const editedEvents: unknown[] = [];
    const onMemberEdited = (model: unknown) => {
      editedEvents.push(model);
    };
    events.on('member.edited', onMemberEdited);

    try {
      await assert.rejects(
        () =>
          cleanExpiredComped({
            db: failingDb,
            models,
            events,
            logging: stubLogging,
            sentry: stubSentry,
          }),
        /forced mid-transaction failure/,
      );

      const relations = await db.knex('members_products').where({ member_id: memberId });
      assert.equal(relations.length, 1, 'The expired product relation survives the rollback');

      const member = await models.Member.findOne({ id: memberId });
      assert.equal(member.get('status'), 'comped', 'The member keeps their comped status');

      const statusEvents = await compedToFreeEvents(memberId);
      assert.equal(statusEvents.length, 0, 'No status history sticks');

      assert.equal(editedEvents.length, 0, 'No model event is emitted for rolled-back work');
    } finally {
      events.removeListener('member.edited', onMemberEdited);
    }
  });
});
