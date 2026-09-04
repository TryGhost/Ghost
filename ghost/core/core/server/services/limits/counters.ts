import type { Counter, Formatter } from '@tryghost/limit-service';

const db = require('../../data/db');

/**
 * How Ghost counts the things it limits.
 *
 * These queries are here rather than in the limit service because they are Ghost's schema:
 * what a staff user is, that Contributors do not count towards one, that a newsletter only
 * counts while it is active. The service asks for a number and has no idea where it comes
 * from, which is the same reason Admin can answer the same questions over HTTP.
 *
 * A counted limit with no counter here cannot be applied, and says so rather than going
 * quiet: the service reports it and Ghost logs it at boot.
 */
export const counters: Record<string, Counter> = {
  members: async ({ transacting } = {}) => {
    const knex = (transacting ?? db.knex) as ReturnType<typeof require>;
    const result = await knex('members').count('id', { as: 'count' }).first();

    return Number(result.count);
  },

  newsletters: async ({ transacting } = {}) => {
    const knex = (transacting ?? db.knex) as ReturnType<typeof require>;
    const result = await knex('newsletters')
      .count('id', { as: 'count' })
      .where('status', '=', 'active')
      .first();

    return Number(result.count);
  },

  emails: async ({ transacting, periodStart } = {}) => {
    const knex = (transacting ?? db.knex) as ReturnType<typeof require>;
    const result = await knex('emails')
      .sum('email_count', { as: 'count' })
      .where('created_at', '>=', periodStart)
      .first();

    // A sum over no rows is null, and some drivers return these aggregates as strings.
    // Either would be compared against the limit as something other than a number.
    return Number(result.count ?? 0);
  },

  staff: async ({ transacting } = {}) => {
    const knex = (transacting ?? db.knex) as ReturnType<typeof require>;
    const result = await knex('users')
      .select('users.id')
      .leftJoin('roles_users', 'users.id', 'roles_users.user_id')
      .leftJoin('roles', 'roles_users.role_id', 'roles.id')
      .whereNot('roles.name', 'Contributor')
      .andWhereNot('users.status', 'inactive')
      .union([
        knex('invites')
          .select('invites.id')
          .leftJoin('roles', 'invites.role_id', 'roles.id')
          .whereNot('roles.name', 'Contributor'),
      ]);

    return result.length;
  },

  // Uploads compare against the size of the file being uploaded, which the caller passes in
  // as `currentCount`, so nothing is ever counted here. The limit still needs a counter to
  // exist, and saying so plainly beats a noop that reads as an oversight.
  uploads: () => 0,
};

/** A size reads better as megabytes than as a number of bytes. */
export const formatters: Record<string, Formatter> = {
  uploads: (count: number) => `${count / 1000000}MB`,
};
