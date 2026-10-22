import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import {
  lockStaffInvites,
  checkTrialStaffLimit,
  STAFF_INVITE_RATE_KEY,
} from '../../../../../core/server/lib/staff-invite-usage';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../../../core/server/services/invites/invitation-limiter';

const dependencies = {
  knex: {} as Knex,
  now: Date.now,
  getUpgradeUrl: () => undefined,
  lockStaffInvites,
  checkTrialStaffLimit,
  STAFF_INVITE_RATE_KEY,
};

describe('Invitation limiter configuration', function () {
  it('leaves unconfigured hosts unrestricted without accessing the database', async function () {
    const limiter = new InvitationLimiter({ ...dependencies, getLimits: () => undefined });
    assert.equal(await limiter.rateLimit(), 0);
    assert.equal(await limiter.run('recipient@example.com', async () => 'prepared'), 'prepared');
  });

  for (const limits of [
    {},
    { maxStaff: 10, maxInvites: 15, maxRequests: 0, rateWindowSeconds: 60 },
    { maxStaff: 10, maxInvites: 15, maxRequests: 3, rateWindowSeconds: 0 },
    { maxStaff: 10, maxInvites: -1, maxRequests: 3, rateWindowSeconds: 60 },
    { maxStaff: 0, maxInvites: 15, maxRequests: 3, rateWindowSeconds: 60 },
    { maxStaff: 10, maxInvites: 1.5, maxRequests: 3, rateWindowSeconds: 60 },
    { maxStaff: 10, maxInvites: 15, maxRequests: 3, rateWindowSeconds: '60' },
  ]) {
    it(`rejects invalid configured policy ${JSON.stringify(limits)}`, async function () {
      const limiter = new InvitationLimiter({
        ...dependencies,
        getLimits: () => limits as InvitationLimits,
      });
      await assert.rejects(
        limiter.run('recipient@example.com', async () => assert.fail()),
        {
          message: 'Invalid staff invitation limits.',
        },
      );
    });
  }
});
