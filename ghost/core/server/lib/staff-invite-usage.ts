import type { Knex } from 'knex';
import errors from '@tryghost/errors';

const STAFF_INVITE_EMAILS_KEY = 'staff_invitation_emails';

/** Sending and accepting invitations use the same lock order. */
export async function lockStaffInvites(
  transaction: Knex.Transaction,
): Promise<{ value: string | null }> {
  const lock = await transaction('settings')
    .select('value')
    .where('key', STAFF_INVITE_EMAILS_KEY)
    .forUpdate()
    .first();
  if (!lock) {
    throw new errors.InternalServerError({
      message: 'Cannot lock the staff invitation email counter.',
    });
  }
  return lock;
}
