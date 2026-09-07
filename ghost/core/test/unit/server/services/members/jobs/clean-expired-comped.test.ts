import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import cleanExpiredComped from '../../../../../../core/server/services/members/jobs/clean-expired-comped-task';

const previousUpdatedAt = new Date('2026-04-28T15:55:45.000Z');

type QueryCall = {
  tableName: string;
  whereInField?: string;
  ids?: string[] | null;
  where?: [string, string];
  data?: any;
  rows?: any[];
};

function createTrx({
  expiredRows,
  compedMembers,
  onDelete,
}: {
  expiredRows: any[];
  compedMembers: any[];
  onDelete?: () => void;
}) {
  const updateCalls: QueryCall[] = [];
  const insertCalls: QueryCall[] = [];
  const deleteCalls: QueryCall[] = [];
  const forUpdateCalls: QueryCall[] = [];
  // Operation order across the whole transaction - the tests pin the full
  // write sequence, most importantly that the member rows are locked before
  // they are updated
  const ops: string[] = [];

  const trx = function trx(tableName: string) {
    const query = {
      ids: null as string[] | null,
      whereInField: undefined as string | undefined,
      andWhereArgs: undefined as [string, string] | undefined,

      where() {
        return query;
      },

      whereIn(field: string, ids: string[]) {
        query.whereInField = field;
        query.ids = ids;
        return query;
      },

      andWhere(field: string, value: string) {
        query.andWhereArgs = [field, value];
        return query;
      },

      forUpdate() {
        forUpdateCalls.push({
          tableName,
          whereInField: query.whereInField,
          ids: query.ids,
          where: query.andWhereArgs,
        });
        ops.push(`forUpdate:${tableName}`);
        return Promise.resolve(compedMembers);
      },

      select() {
        return Promise.resolve(expiredRows);
      },

      del() {
        deleteCalls.push({ tableName, ids: query.ids });
        ops.push(`del:${tableName}`);
        onDelete?.();
        return Promise.resolve(query.ids!.length);
      },

      update(data: any) {
        updateCalls.push({ tableName, ids: query.ids, data });
        ops.push(`update:${tableName}`);
        return Promise.resolve(query.ids!.length);
      },

      insert(rows: any[]) {
        insertCalls.push({ tableName, rows });
        ops.push(`insert:${tableName}`);
        return Promise.resolve();
      },
    };

    return query;
  };

  return { trx, updateCalls, insertCalls, deleteCalls, forUpdateCalls, ops };
}

describe('clean-expired-comped task', function () {
  let logging: { info: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub };
  let sentry: { captureException: sinon.SinonStub };
  let events: { emit: sinon.SinonStub };
  let memberModel: {
    attributes: Record<string, unknown>;
    _previousAttributes?: Record<string, any>;
    _changed?: Record<string, any>;
  };
  let findOne: sinon.SinonStub;

  beforeEach(function () {
    logging = { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    sentry = { captureException: sinon.stub() };
    events = { emit: sinon.stub() };
    memberModel = {
      attributes: {
        id: 'member-id',
        email: 'member@example.com',
        status: 'free',
      },
    };
    findOne = sinon.stub().resolves(memberModel);
  });

  afterEach(function () {
    sinon.restore();
  });

  function createDeps(trx: unknown) {
    return {
      db: { knex: { transaction: (fn: (trx: unknown) => unknown) => fn(trx) } as never },
      models: { Member: { findOne } } as never,
      events,
      logging,
      sentry,
    };
  }

  it('deletes expired rows, updates comped members and records status events in one unit', async function () {
    const { trx, updateCalls, insertCalls, deleteCalls, forUpdateCalls, ops } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
    });

    const result = await cleanExpiredComped(createDeps(trx));

    assert.deepEqual(deleteCalls, [
      { tableName: 'members_products', ids: ['expired-product-relation-id'] },
    ]);

    // Only the affected members, filtered to those still comped, are read -
    // and read with a row lock taken before the update, so a concurrent
    // status change cannot slip in between the read and the update. The ops
    // assertion pins the whole write sequence of the transaction.
    assert.deepEqual(forUpdateCalls, [
      { tableName: 'members', whereInField: 'id', ids: ['member-id'], where: ['status', 'comped'] },
    ]);
    assert.deepEqual(ops, [
      'forUpdate:members',
      'del:members_products',
      'update:members',
      'insert:members_status_events',
    ]);

    assert.equal(updateCalls.length, 1);
    assert.equal(updateCalls[0]!.tableName, 'members');
    assert.deepEqual(updateCalls[0]!.ids, ['member-id']);
    assert.equal(updateCalls[0]!.data.status, 'free');
    assert.ok(updateCalls[0]!.data.updated_at instanceof Date);

    // Status event shares the same timestamp as the member update (not a raw CURRENT_TIMESTAMP)
    const statusEventInsert = insertCalls.find(
      (call) => call.tableName === 'members_status_events',
    );
    assert.ok(statusEventInsert);
    const statusEvent = statusEventInsert!.rows![0];
    assert.equal(typeof statusEvent.id, 'string');
    assert.equal(statusEvent.member_id, 'member-id');
    assert.equal(statusEvent.from_status, 'comped');
    assert.equal(statusEvent.to_status, 'free');
    assert.deepEqual(statusEvent.created_at, updateCalls[0]!.data.updated_at);

    assert.deepEqual(result, {
      deletedSubscriptionCount: 1,
      updatedMemberCount: 1,
      emittedEventCount: 1,
    });
  });

  it('emits a member.edited model event per updated member after the transaction', async function () {
    const { trx, updateCalls } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
    });

    await cleanExpiredComped(createDeps(trx));

    sinon.assert.calledOnceWithExactly(
      findOne,
      { id: 'member-id' },
      { require: true, context: { internal: true } },
    );

    sinon.assert.calledOnce(events.emit);
    const [eventName, emittedModel, options] = events.emit.firstCall.args;
    assert.equal(eventName, 'member.edited');
    assert.equal(emittedModel, memberModel);
    assert.equal(emittedModel._previousAttributes!.status, 'comped');
    assert.deepEqual(emittedModel._previousAttributes!.updated_at, previousUpdatedAt);
    assert.equal(emittedModel._changed!.status, 'free');
    assert.deepEqual(emittedModel._changed!.updated_at, updateCalls[0]!.data.updated_at);
    assert.deepEqual(options, { context: { internal: true } });
  });

  it('does nothing when no comped subscriptions have expired', async function () {
    const { trx, updateCalls, insertCalls, deleteCalls } = createTrx({
      expiredRows: [],
      compedMembers: [],
    });

    const result = await cleanExpiredComped(createDeps(trx));

    assert.equal(deleteCalls.length, 0);
    assert.equal(updateCalls.length, 0);
    assert.equal(insertCalls.length, 0);
    sinon.assert.notCalled(events.emit);
    assert.deepEqual(result, {
      deletedSubscriptionCount: 0,
      updatedMemberCount: 0,
      emittedEventCount: 0,
    });
  });

  it('does not emit model events when the transaction fails', async function () {
    const { trx } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
      onDelete: () => {
        throw new Error('database has gone away');
      },
    });

    await assert.rejects(() => cleanExpiredComped(createDeps(trx)), /database has gone away/);

    sinon.assert.notCalled(events.emit);
  });

  it('skips the model event with a warning when the member no longer exists', async function () {
    const { trx } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
    });
    findOne.rejects({ errorType: 'NotFoundError' });

    const result = await cleanExpiredComped(createDeps(trx));

    sinon.assert.notCalled(events.emit);
    sinon.assert.calledOnce(logging.warn);
    assert.equal(result.updatedMemberCount, 1);
    assert.equal(result.emittedEventCount, 0);
  });

  it('logs and reports an unexpected model event failure without failing the job', async function () {
    const { trx } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
    });
    const failure = new Error('events bus is broken');
    events.emit.throws(failure);

    const result = await cleanExpiredComped(createDeps(trx));

    sinon.assert.calledWithExactly(logging.error, failure);
    sinon.assert.calledWithExactly(sentry.captureException, failure);
    assert.equal(result.emittedEventCount, 0);
  });

  it('logs a structured clean_expired_comped.completed event', async function () {
    const { trx } = createTrx({
      expiredRows: [{ id: 'expired-product-relation-id', member_id: 'member-id' }],
      compedMembers: [{ id: 'member-id', status: 'comped', updated_at: previousUpdatedAt }],
    });

    await cleanExpiredComped(createDeps(trx));

    const completionLog = logging.info.getCalls().find((call) => {
      return call.args[0]?.system?.event === 'clean_expired_comped.completed';
    });
    assert.ok(completionLog, 'the task logs a structured clean_expired_comped.completed event');
    const { system } = completionLog!.args[0];
    assert.equal(system.deleted_subscription_count, 1);
    assert.equal(system.updated_member_count, 1);
    assert.equal(system.emitted_event_count, 1);
    assert.equal(typeof system.duration_ms, 'number');
  });
});
