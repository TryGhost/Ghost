import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

export const STAFF_INVITE_RATE_KEY = 'staff-invites:requests';

/** All trial staff creation and invitation replacement use the same lock order. */
export async function lockStaffInvites(
  transaction: Knex.Transaction,
): Promise<{ count: number; firstRequest: number; lastRequest: number }> {
  // Reuse the request limiter's row as the site-wide lock. Its expiry is safe:
  // the durable allowance lives in actions, not in this temporary rate state.
  await transaction('brute')
    .insert({
      key: STAFF_INVITE_RATE_KEY,
      firstRequest: 0,
      lastRequest: 0,
      lifetime: 0,
      count: 0,
    })
    .onConflict('key')
    .merge(['key']);
  return transaction('brute').where({ key: STAFF_INVITE_RATE_KEY }).forUpdate().first();
}

export async function checkTrialStaffLimit(
  transaction: Knex.Transaction,
  maxStaff: number,
  helpLink?: string,
  replacingEmail?: string,
): Promise<void> {
  if (!Number.isSafeInteger(maxStaff) || maxStaff < 1) {
    throw new errors.IncorrectUsageError({ message: 'Invalid trial staff limit.' });
  }
  const limit = new MaxLimit({
    name: 'staff',
    errors,
    helpLink,
    config: {
      max: maxStaff,
      currentCountQuery: async () => {
        // All roles and statuses occupy a trial seat. Replacing an invitation
        // reuses its slot; accepting one deletes it in the same transaction.
        // Locking reads see current rows even if an import transaction already has a snapshot.
        const users = await transaction('users')
          .select('id')
          .limit(maxStaff + 1)
          .forUpdate();
        const invitesQuery = transaction('invites');
        if (replacingEmail) {
          invitesQuery.whereNot('email', replacingEmail.trim());
        }
        const invites = await invitesQuery
          .select('id')
          .limit(maxStaff + 1)
          .forUpdate();
        return users.length + invites.length;
      },
      error:
        'Your trial supports up to {{max}} staff, including pending invitations and Contributors. Upgrade to invite more people.',
    },
  });
  await limit.errorIfWouldGoOverLimit();
}
