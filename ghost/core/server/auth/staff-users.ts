import type { User } from './principal';

/** An active staff user by id, with the roles permission checks read, or null. */
export function findActiveStaffUser(id: string): Promise<User | null> {
  const models = require('../models');
  return models.User.findOne({ id, status: 'active' }, { withRelated: ['roles'] });
}
