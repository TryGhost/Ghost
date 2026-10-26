import type { Knex } from 'knex';
import errors from '@tryghost/errors';

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
