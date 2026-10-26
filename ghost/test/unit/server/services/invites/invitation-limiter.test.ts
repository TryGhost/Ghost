import assert from 'node:assert/strict';
import { LimitService } from '@tryghost/limit-service';
import { lockStaffInvites } from '../../../../../core/server/lib/staff-invite-usage';
import InvitationLimiter from '../../../../../core/server/services/invites/invitation-limiter';

describe('Invitation limiter', function () {
  it('leaves unconfigured hosts unrestricted without accessing the database', async function () {
    const limiter = new InvitationLimiter({
      transaction: async () => assert.fail('Unexpected database access'),
      limitService: new LimitService(),
      lockStaffInvites,
    });
    assert.equal(await limiter.run('recipient@example.com', async () => 'prepared'), 'prepared');
  });
});
