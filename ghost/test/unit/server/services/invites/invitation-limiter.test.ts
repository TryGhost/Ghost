import assert from 'node:assert/strict';
import { LimitService } from '@tryghost/limit-service';
import InvitationLimiter from '../../../../../core/server/services/invites/invitation-limiter';

describe('Invitation limiter', function () {
  it('leaves unconfigured hosts unrestricted without accessing the database', async function () {
    const limiter = new InvitationLimiter({
      transaction: async () => assert.fail('Unexpected database access'),
      limitService: new LimitService(),
      Settings: { findOne: async () => assert.fail('Unexpected settings access') },
      getPeriodStart: () => assert.fail('Unexpected period lookup'),
    });
    assert.equal(await limiter.run('recipient@example.com', async () => 'prepared'), 'prepared');
  });
});
