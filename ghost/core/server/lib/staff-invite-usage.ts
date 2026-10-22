import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { MaxLimit } from '@tryghost/limit-service';

const STAFF_INVITE_LOCK_KEY = 'staff_invitation_lock';

/** All trial staff creation and invitation replacement use the same lock order. */
export async function lockStaffInvites(transaction: Knex.Transaction): Promise<void> {
  const lock = await transaction('settings')
    .select('id')
    .where('key', STAFF_INVITE_LOCK_KEY)
    .forUpdate()
    .first();
  if (!lock) {
    throw new errors.InternalServerError({
      message: 'Cannot lock the trial staff invitation limits.',
    });
  }
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
  if (
    replacingEmail &&
    (await transaction('invites').where('email', replacingEmail.trim()).forUpdate().first('id'))
  ) {
    return;
  }
  const limit = new MaxLimit({
    name: 'staff',
    errors,
    helpLink,
    config: {
      max: maxStaff,
      currentCountQuery: async () => {
        // All roles and statuses occupy a trial seat.
        const users = await transaction('users')
          .select('id')
          .limit(maxStaff + 1);
        const invites = await transaction('invites')
          .select('id')
          .limit(maxStaff + 1);
        return users.length + invites.length;
      },
      error:
        'Your trial supports up to {{max}} staff, including pending invitations and Contributors.',
    },
  });
  await limit.errorIfWouldGoOverLimit();
}
