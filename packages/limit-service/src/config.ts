import type { Knex, LimitConfig } from './types.ts';

// NOTE: to support a new config in the limit service add an empty key-object pair in the export below.
// Each type of limit has it's own structure:
// 1. FlagLimit and AllowlistLimit types are empty objects paired with a key, e.g.: `customThemes: {}`
// 2. MaxLimit should contain a `currentCountQuery` function which would count the resources under limit
const config: Record<string, LimitConfig> = {
    members: {
        currentCountQuery: async (knex: Knex) => {
            const result = await knex('members').count('id', {as: 'count'}).first();
            return result.count;
        }
    },
    limitAutomations: {
        currentCountQuery: async (knex: Knex) => {
            // Legacy welcome emails have no action graph until conversion.
            const result = await knex('automations')
                .count('id', {as: 'count'})
                .where('status', '=', 'active')
                .whereExists(knex('automation_actions').select('id')
                    .whereRaw('automation_id = automations.id')
                    .whereNull('deleted_at'))
                .first();
            return result.count;
        }
    },
    newsletters: {
        currentCountQuery: async (knex: Knex) => {
            const result = await knex('newsletters')
                .count('id', {as: 'count'})
                .where('status', '=', 'active')
                .first();

            return result.count;
        }
    },
    emails: {
        currentCountQuery: async (knex: Knex, startDate?: string) => {
            const result = await knex('emails')
                .sum('email_count', {as: 'count'})
                .where('created_at', '>=', startDate)
                .first();

            return result.count;
        }
    },
    staff: {
        currentCountQuery: async (knex: Knex) => {
            const result = await knex('users')
                .select('users.id')
                .leftJoin('roles_users', 'users.id', 'roles_users.user_id')
                .leftJoin('roles', 'roles_users.role_id', 'roles.id')
                .whereNot('roles.name', 'Contributor').andWhereNot('users.status', 'inactive').union([
                    knex('invites')
                        .select('invites.id')
                        .leftJoin('roles', 'invites.role_id', 'roles.id')
                        .whereNot('roles.name', 'Contributor')
                ]);

            return result.length;
        }
    },
    limitTrialStaff: {
        currentCountQuery: async (knex: Knex, _periodStart?: string, max?: number) => {
            // All roles and statuses occupy a trial seat.
            const usersQuery = knex('users').select('id');
            const invitesQuery = knex('invites').select('id');
            if (max !== undefined) {
                usersQuery.limit(max + 1);
                invitesQuery.limit(max + 1);
            }
            const users = await usersQuery;
            const invites = await invitesQuery;
            return users.length + invites.length;
        }
    },
    limitTrialStaffInvites: {
        currentCountQuery: async (knex: Knex, _periodStart?: string, max?: number) => {
            const query = knex('actions')
                .select('id')
                .where({resource_type: 'invite', event: 'added'});
            // Bound returned rows; this does not bound rows scanned without an index.
            if (max !== undefined) {
                query.limit(max + 1);
            }
            return (await query).length;
        }
    },
    customIntegrations: {},
    customThemes: {},
    uploads: {
        // NOTE: this function should not ever be used as for uploads we compare the size
        //       of the uploaded file with the configured limit. Noop is here to keep the
        //       MaxLimit constructor happy
        currentCountQuery: () => undefined,
        // NOTE: the uploads limit is based on file sizes provided in Bytes
        //       a custom formatter is here for more user-friendly formatting when forming an error
        formatter: count => `${Number(count) / 1000000}MB`
    },
    limitStripeConnect: {},
    limitAnalytics: {},
    limitSocialWeb: {},
    limitCustomFields: {},
    publicSiteAccess: {}
};

export default config;
