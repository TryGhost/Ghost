import assert from 'node:assert/strict';
import {
  lockStaffInvites,
  checkTrialStaffLimit,
} from '../../../../../core/server/lib/staff-invite-usage';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../../../core/server/services/invites/invitation-limiter';

const dependencies = {
  transaction: async () => assert.fail('Unexpected database access'),
  getUpgradeUrl: () => undefined,
  lockStaffInvites,
  checkTrialStaffLimit,
};

describe('Invitation limiter configuration', function () {
  it('leaves unconfigured hosts unrestricted without accessing the database', async function () {
    const limiter = new InvitationLimiter({ ...dependencies, getLimits: () => undefined });
    assert.equal(await limiter.run('recipient@example.com', async () => 'prepared'), 'prepared');
  });

  for (const limits of [
    {},
    { maxStaff: 10, maxInvites: -1 },
    { maxStaff: 0, maxInvites: 15 },
    { maxStaff: 10, maxInvites: 1.5 },
    { maxStaff: '10', maxInvites: 15 },
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
