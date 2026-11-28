import type { User } from './principal';
import { isActiveStaffStatus } from '../../shared/staff-status';

/** An active staff user by id, with the roles permission checks read, or null. */
export async function findActiveStaffUser(id: string): Promise<User | null> {
  const models = require('../models');
  const user: User | null = await models.User.findOne(
    { id, status: 'all' },
    { withRelated: ['roles'] },
  );
  return user && isActiveStaffStatus(user.get('status')) ? user : null;
}
