import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import ObjectId from 'bson-objectid';
import { lockStaffInvites } from '../../../core/server/lib/staff-invite-usage';
import InvitationLimiter from '../../../core/server/services/invites/invitation-limiter';
const { limitService, init: initLimits } = require('../../../core/server/services/limits');
import { lastPeriodStart, type LimitConfig } from '@tryghost/limit-service';
import { vi } from 'vitest';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');

const dependencies = {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>): Promise<T> =>
    models.Base.transaction(callback),
  limitService,
  lockStaffInvites,
  getPeriodStart: () =>
    config.get('hostSettings:limits:inviteEmails:maxPeriodic') !== undefined
      ? lastPeriodStart(config.get('hostSettings:subscription:start'), 'month')
      : null,
};

describe('Trial invitation admission', function () {
  let limits: Record<string, LimitConfig> | undefined;
  let limiter: InvitationLimiter;
  let originalLimits: Record<string, LimitConfig> | undefined;
  let originalSubscription: unknown;
  let roleId: string;
  let actorId: string;

  beforeAll(async function () {
    await dbUtils.reset();
    await models.Settings.populateDefaults();
    originalLimits = config.get('hostSettings:limits');
    originalSubscription = config.get('hostSettings:subscription');
    roleId = (await db.knex('roles').where({ name: 'Contributor' }).first()).id;
    actorId = (await db.knex('users').first()).id;
  });

  beforeEach(async function () {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T10:00:00Z'));
    config.set('hostSettings:subscription', { start: '2026-10-10T10:00:00Z' });
    await db.knex('settings').where('key', 'staff_invitation_emails').update({ value: null });
    await dbUtils.truncate('brute');
    await dbUtils.truncate('actions');
    await dbUtils.truncate('invites');
    limits = {
      allStaff: {
        max: 10,
        error:
          'Your trial supports up to {{max}} staff, including pending invitations and Contributors.',
      },
      inviteEmails: {
        maxPeriodic: 15,
        error: 'Your trial allows {{max}} staff invitation emails per month, including resends.',
      },
    };
    config.set('hostSettings:limits', limits);
    initLimits();
    limiter = new InvitationLimiter({
      ...dependencies,
    });
  });

  afterEach(function () {
    vi.useRealTimers();
    vi.restoreAllMocks();
    config.set('hostSettings:subscription', originalSubscription);
    config.set('hostSettings:limits', originalLimits);
    initLimits();
  });

  async function prepare(email: string, transacting?: Knex.Transaction) {
    const options = { context: { user: actorId }, transacting };
    const existing = await models.Invite.findOne({ email }, options);
    if (existing) {
      await existing.destroy(options);
    }
    return models.Invite.add({ email, role_id: roleId }, options);
  }

  function actions() {
    return db.knex('actions').where({ resource_type: 'invite', event: 'added' });
  }

  async function savedCounter() {
    const row = await db.knex('settings').where('key', 'staff_invitation_emails').first();
    return JSON.parse(row.value ?? 'null');
  }

  it('enforces the email allowance without a trial seat cap', async function () {
    config.set('hostSettings:limits', { inviteEmails: { maxPeriodic: 1 } });
    initLimits();
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    await assert.rejects(
      limiter.run('second@example.com', (transaction) =>
        prepare('second@example.com', transaction),
      ),
      { errorType: 'HostLimitError' },
    );
    assert.equal((await savedCounter()).count, 1);
  });

  it('enforces the trial seat cap without an email allowance', async function () {
    const [{ count }] = await db.knex('users').count('* as count');
    config.set('hostSettings:limits', { allStaff: { max: Number(count) + 1 } });
    initLimits();
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    await assert.rejects(
      limiter.run('second@example.com', (transaction) =>
        prepare('second@example.com', transaction),
      ),
      { errorType: 'HostLimitError' },
    );
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    assert.equal((await db.knex('invites')).length, 1);
  });

  it('initializes the internal lock setting and restores it on an existing site', async function () {
    const initial = await db.knex('settings').where({ key: 'staff_invitation_emails' }).first();
    assert.ok(initial);
    assert.equal(initial.group, 'core');
    assert.equal(initial.value, null);
    await db.knex('settings').where({ id: initial.id }).delete();
    await models.Settings.populateDefaults();
    const restored = await db.knex('settings').where({ key: 'staff_invitation_emails' });
    assert.equal(restored.length, 1);
    assert.equal(restored[0].group, 'core');
    await models.Settings.populateDefaults();
    assert.equal((await db.knex('settings').where({ key: 'staff_invitation_emails' })).length, 1);
  });

  it('fails closed if the lock setting is missing', async function () {
    await assert.rejects(
      models.Base.transaction(async (transaction: Knex.Transaction) => {
        await transaction('settings').where({ key: 'staff_invitation_emails' }).delete();
        await lockStaffInvites(transaction);
      }),
      /Cannot lock the staff invitation email counter/,
    );
  });

  it('allows brute cleanup while an invitation holds the shared lock', async function () {
    const BruteKnex = require('@tryghost/brute-knex');
    const store = new BruteKnex({ tablename: 'brute', createTable: false, knex: db.knex });
    await db
      .knex('brute')
      .insert({ key: 'expired-test', firstRequest: 0, lastRequest: 0, lifetime: 0, count: 0 });
    let read: Promise<unknown> | undefined;
    try {
      await models.Base.transaction(async (transaction: Knex.Transaction) => {
        await lockStaffInvites(transaction);
        read = new Promise((resolve, reject) => {
          store.get('unrelated-login', (error: Error | null, value: unknown) =>
            error ? reject(error) : resolve(value),
          );
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            read,
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Brute cleanup waited for the invitation lock')),
                2000,
              );
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      });
    } finally {
      await read;
    }
    assert.deepEqual(await db.knex('brute').select(), []);
  });

  it('admits only fifteen concurrent email preparations even without the HTTP guard', async function () {
    limits!.allStaff.max = 50;
    config.set('hostSettings:limits', limits);
    initLimits();
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, (_, i) => {
        const email = `person-${i}@example.com`;
        return limiter.run(email, (transaction) => prepare(email, transaction));
      }),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 15);
    for (const result of results) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.errorType, 'HostLimitError');
        assert.match(result.reason.message, /15 staff invitation emails/);
      }
    }
    assert.equal((await savedCounter()).count, 15);
  });

  it('preserves the trial allowance after rate cleanup and refreshing the policy', async function () {
    for (let i = 0; i < 15; i++) {
      await limiter.run('resend@example.com', (transaction) =>
        prepare('resend@example.com', transaction),
      );
    }
    await dbUtils.truncate('brute');
    const restarted = new InvitationLimiter({
      ...dependencies,
    });
    await assert.rejects(
      restarted.run('new@example.com', async () => assert.fail()),
      /staff invitation emails/,
    );
    assert.equal((await savedCounter()).count, 15);
  });

  it('reserves the last seat atomically, including pending Contributor invitations', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    limits!.allStaff.max = Number(users.count) + 1;
    config.set('hostSettings:limits', limits);
    initLimits();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        limiter.run(`person-${i}@example.com`, (transaction) =>
          prepare(`person-${i}@example.com`, transaction),
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const invite = await db.knex('invites').first();
    // A resend reuses the occupied slot even at capacity.
    await limiter.run(invite.email, (transaction) => prepare(invite.email, transaction));
    assert.equal((await savedCounter()).count, 2);
  });

  it('leaves counted records available to other transactions during preparation', async function () {
    const existing = await limiter.run('existing@example.com', (transaction) =>
      prepare('existing@example.com', transaction),
    );

    await limiter.run('new@example.com', async (transaction) => {
      await db.knex.transaction(async (other: Knex.Transaction) => {
        await other('users').where({ id: actorId }).forUpdate().noWait().first();
        await other('invites').where({ id: existing.id }).forUpdate().noWait().first();
      });
      return prepare('new@example.com', transaction);
    });
  });

  it('creates the installation user fixture inside a migration transaction on a trial', async function () {
    const { fixtureManager } = require('../../../core/server/data/schema/fixtures');
    const fixtures = require('../../../core/server/data/schema/fixtures/fixtures.json');
    const owner = fixtures.models.find((model: { name: string }) => model.name === 'User')
      .entries[0];
    const id = ObjectId().toHexString();
    const rollback = new Error('Roll back installation fixture');

    await assert.rejects(
      models.Base.transaction(async (transacting: Knex.Transaction) => {
        const result = await fixtureManager.addFixturesForModel(
          {
            name: 'User',
            entries: [{ ...owner, id, email: 'installation-owner@example.com' }],
          },
          {
            transacting,
            migrating: true,
            autoRefresh: false,
            context: { internal: true, user: id },
          },
        );
        assert.equal(result.done, 1);
        assert.ok(await transacting('users').where({ id }).first());
        assert.deepEqual(await transacting('actions').where({ resource_type: 'invite' }), []);
        throw rollback;
      }),
      (error) => error === rollback,
    );
    assert.equal(await db.knex('users').where({ id }).first(), undefined);
  });

  it('rolls back email allowance and invitation changes on preparation failure', async function () {
    await assert.rejects(
      limiter.run('person@example.com', async (transaction) => {
        await prepare('person@example.com', transaction);
        throw new Error('Invalid invitation');
      }),
      /Invalid invitation/,
    );
    assert.deepEqual(await actions(), []);
    assert.deepEqual(await db.knex('invites').select(), []);
  });

  it('stops enforcing on upgrade without erasing the previously used allowance', async function () {
    await limiter.run('person@example.com', (transaction) =>
      prepare('person@example.com', transaction),
    );
    config.set('hostSettings:limits', undefined);
    initLimits();
    await limiter.run('paid@example.com', async (transaction) =>
      assert.equal(transaction, undefined),
    );
    assert.equal((await savedCounter()).count, 1);
    config.set('hostSettings:limits', {
      ...limits,
      inviteEmails: { ...limits!.inviteEmails, maxPeriodic: 1 },
    });
    initLimits();
    await assert.rejects(
      limiter.run('trial-again@example.com', async () => assert.fail()),
      /staff invitation emails/,
    );
  });

  it('starts with a fresh allowance even when older invitation audit records exist', async function () {
    await db.knex('actions').insert(
      Array.from({ length: 15 }, () => ({
        id: ObjectId().toHexString(),
        resource_type: 'invite',
        resource_id: ObjectId().toHexString(),
        actor_type: 'user',
        actor_id: actorId,
        event: 'added',
        created_at: new Date(),
      })),
    );
    await limiter.run('fresh@example.com', (transaction) =>
      prepare('fresh@example.com', transaction),
    );
    assert.equal((await savedCounter()).count, 1);
  });

  it('reserves an email without requiring an audit actor', async function () {
    await limiter.run('internal@example.com', (transacting) =>
      models.Invite.add(
        { email: 'internal@example.com', role_id: roleId, status: 'pending' },
        { transacting, context: { internal: true } },
      ),
    );
    assert.equal((await savedCounter()).count, 1);
  });

  it('keeps a reservation in the checked period when preparation crosses the reset time', async function () {
    vi.setSystemTime(new Date('2026-11-10T09:59:59Z'));
    const oldPeriod = dependencies.getPeriodStart();
    await db
      .knex('settings')
      .where('key', 'staff_invitation_emails')
      .update({
        value: JSON.stringify({ periodStart: oldPeriod, count: 14 }),
      });
    await limiter.run('last@example.com', async (transaction) => {
      vi.setSystemTime(new Date('2026-11-10T10:00:01Z'));
      return prepare('last@example.com', transaction);
    });
    assert.deepEqual(await savedCounter(), { periodStart: oldPeriod, count: 15 });
    await limitService.errorIfWouldGoOverLimit('inviteEmails');
    // Reading the new period does not rewrite the saved counter.
    assert.deepEqual(await savedCounter(), { periodStart: oldPeriod, count: 15 });
    await limiter.run('new-month@example.com', (transaction) =>
      prepare('new-month@example.com', transaction),
    );
    assert.deepEqual(await savedCounter(), { periodStart: '2026-11-10T10:00:00.000Z', count: 1 });
  });

  it('rechecks if the limit check itself crosses the reset, even when the old period is full', async function () {
    vi.setSystemTime(new Date('2026-11-10T09:59:59Z'));
    await db
      .knex('settings')
      .where('key', 'staff_invitation_emails')
      .update({
        value: JSON.stringify({ periodStart: dependencies.getPeriodStart(), count: 15 }),
      });
    const check = limitService.errorIfWouldGoOverLimit.bind(limitService);
    vi.spyOn(limitService, 'errorIfWouldGoOverLimit').mockImplementationOnce(
      async (...args: Parameters<typeof check>) => {
        try {
          return await check(...args);
        } finally {
          vi.setSystemTime(new Date('2026-11-10T10:00:01Z'));
        }
      },
    );
    await limiter.run('boundary@example.com', (transaction) =>
      prepare('boundary@example.com', transaction),
    );
    assert.deepEqual(await savedCounter(), { periodStart: '2026-11-10T10:00:00.000Z', count: 1 });
  });

  it('keeps usage when only the allowance changes and follows a new subscription date', async function () {
    config.set('hostSettings:limits:inviteEmails:maxPeriodic', 1);
    initLimits();
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    config.set('hostSettings:limits:inviteEmails:maxPeriodic', 2);
    initLimits();
    await limiter.run('second@example.com', (transaction) =>
      prepare('second@example.com', transaction),
    );
    assert.equal((await savedCounter()).count, 2);
    config.set('hostSettings:subscription:start', '2026-10-25T12:34:56Z');
    initLimits();
    await limiter.run('new-sub@example.com', (transaction) =>
      prepare('new-sub@example.com', transaction),
    );
    assert.deepEqual(await savedCounter(), { periodStart: '2026-10-25T12:34:56.000Z', count: 1 });
  });

  it('blocks sends and resends with a disabled flag and no subscription date', async function () {
    const original = await limiter.run('existing@example.com', (transaction) =>
      prepare('existing@example.com', transaction),
    );
    config.set('hostSettings:limits', { inviteEmails: { disabled: true } });
    config.set('hostSettings:subscription', undefined);
    initLimits();
    for (const email of ['new@example.com', 'existing@example.com']) {
      await assert.rejects(
        limiter.run(email, () => assert.fail('Must not prepare an email')),
        { errorType: 'HostLimitError' },
      );
    }
    assert.equal((await models.Invite.findOne({ email: 'existing@example.com' })).id, original.id);
    assert.equal((await savedCounter()).count, 1);
  });
});
