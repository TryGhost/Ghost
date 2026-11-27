import errors from '@tryghost/errors';
import { assert, describe, it } from 'vitest';
import { linkOrConflict } from '../../../../../../../core/server/services/stripe/services/webhook/link-subscription';

const link = { id: 'member_1', subscription: { id: 'sub_1', customer: 'cus_1' } };

describe('linkOrConflict', function () {
  // Two deliveries for the same new subscription, such as its `created` and `updated` events, can
  // both try to insert it. The webhook outcome tests can't make two deliveries race.
  it('throws a conflict when another delivery saved the subscription first', async function () {
    const duplicate = Object.assign(new Error("Duplicate entry 'sub_1'"), { code: 'ER_DUP_ENTRY' });

    let thrown: unknown;
    try {
      await linkOrConflict(
        {
          linkSubscription: async () => {
            throw duplicate;
          },
        },
        link,
      );
    } catch (err) {
      thrown = err;
    }

    assert.instanceOf(thrown, errors.ConflictError);
  });
});
