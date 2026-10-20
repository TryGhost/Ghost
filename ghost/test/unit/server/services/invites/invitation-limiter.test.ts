import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../../../core/server/services/invites/invitation-limiter';

describe('Invitation limiter configuration', function () {
  const noDatabase = {} as Knex;

  it('leaves unconfigured hosts unrestricted without accessing the database', async function () {
    const limiter = new InvitationLimiter(noDatabase, () => undefined);
    assert.equal(await limiter.rateLimit(), 0);
    assert.equal(await limiter.run('recipient@example.com', async () => 'prepared'), 'prepared');
  });

  for (const limits of [
    {},
    { maxStaff: 10, maxInvites: 15, minIntervalSeconds: 0 },
    { maxStaff: 10, maxInvites: -1, minIntervalSeconds: 60 },
    { maxStaff: 0, maxInvites: 15, minIntervalSeconds: 60 },
    { maxStaff: 10, maxInvites: 1.5, minIntervalSeconds: 60 },
    { maxStaff: 10, maxInvites: 15, minIntervalSeconds: '60' },
  ]) {
    it(`rejects invalid configured policy ${JSON.stringify(limits)}`, async function () {
      const limiter = new InvitationLimiter(noDatabase, () => limits as InvitationLimits);
      await assert.rejects(
        limiter.run('recipient@example.com', async () => assert.fail()),
        {
          message: 'Invalid staff invitation limits.',
        },
      );
    });
  }
});
