import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { LimitService, lastPeriodStart, config as limitsConfig } from '@tryghost/limit-service';
import errors from '@tryghost/errors';
import { vi } from 'vitest';
import { accept, type Invitation } from '../../../core/server/services/invites/accept';
import InvitationLimiter from '../../../core/server/services/invites/invitation-limiter';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');
const models = require('../../../core/server/models');
const security = require('@tryghost/security');
const countStaff = limitsConfig.allStaff.currentCountQuery;
assert.ok(countStaff);

describe('Invitation acceptance during limit checks', function () {
  let roleId: string;
  let invitation: Invitation;
  let initialSeats: number;
  let limitService: LimitService;
  const subscriptionStart = '2026-10-10T10:00:00.000Z';

  beforeEach(async function () {
    await dbUtils.reset();
    await models.Settings.populateDefaults();
    roleId = (await db.knex('roles').where({ name: 'Contributor' }).first()).id;
    const pending = await models.Invite.add(
      { email: 'acceptance@example.com', role_id: roleId, status: 'sent' },
      { context: { internal: true } },
    );
    invitation = {
      invitation: [
        {
          token: security.url.encodeBase64(pending.get('token')),
          name: 'Accepted contributor',
          password: 'Sl1m3rson99',
        },
      ],
    };
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    initialSeats = Number(users.count) + 1;
    limitService = new LimitService();
    limitService.loadLimits({
      limits: {
        allStaff: { max: initialSeats + 1 },
        inviteEmails: { maxPeriodic: 15 },
      },
      subscription: { interval: 'month', startDate: subscriptionStart },
      db,
      errors,
    });
  });

  afterEach(function () {
    vi.restoreAllMocks();
  });

  for (const isolationLevel of ['read committed', 'repeatable read'] as const) {
    it(`keeps the total consistent when acceptance finishes during counting (${isolationLevel})`, async function () {
      await db.knex.transaction(
        async (transacting: Knex.Transaction) => {
          const query = transacting.client.query.bind(transacting.client);
          vi.spyOn(transacting.client, 'query').mockImplementationOnce(async (...args) => {
            const result = await query(...args);
            // Finish acceptance after the first count statement. Separate user/invite
            // statements would mix the old user count with the new invitation count.
            await accept(invitation, models);
            return result;
          });

          assert.equal(await countStaff(transacting), initialSeats);
        },
        { isolationLevel },
      );
      assert.equal(await countStaff(db.knex), initialSeats);
    });

    it(`accepts an invitation only once while sending holds the counter lock (${isolationLevel})`, async function () {
      const transaction = <T>(callback: (transacting: Knex.Transaction) => Promise<T>) =>
        db.knex.transaction(callback, { isolationLevel });
      const limiter = new InvitationLimiter({
        transaction,
        limitService,
        Settings: models.Settings,
        getPeriodStart: () => lastPeriodStart(subscriptionStart, 'month'),
      });
      const acceptanceModels = {
        Base: { transaction },
        Invite: models.Invite,
        User: models.User,
      };

      await limiter.run('new-staff@example.com', async (transacting) => {
        const results = await Promise.allSettled([
          accept(invitation, acceptanceModels),
          accept(invitation, acceptanceModels),
        ]);
        assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
        const rejected = results.find((result) => result.status === 'rejected');
        assert.equal(rejected?.reason.errorType, 'NotFoundError');
        return models.Invite.add(
          { email: 'new-staff@example.com', role_id: roleId, status: 'pending' },
          { transacting, context: { internal: true } },
        );
      });

      assert.equal(await countStaff(db.knex), initialSeats + 1);
      const counter = await db.knex('settings').where('key', 'staff_invitation_emails').first();
      assert.equal(JSON.parse(counter.value).count, 1);
    });
  }
});
