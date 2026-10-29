import errors from '@tryghost/errors';
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
    allStaff: {
        currentCountQuery: async (knex: Knex) => {
            const users = await knex('users').count('id', {as: 'count'}).first();
            const invites = await knex('invites').count('id', {as: 'count'}).first();
            return Number(users.count) + Number(invites.count);
        }
    },
    inviteEmails: {
        currentCountQuery: async (knex: Knex, periodStart?: string) => {
            const setting = await knex('settings').select('value')
                .where('key', 'staff_invitation_emails').first();
            if (!setting) {
                throw new errors.IncorrectUsageError({message: 'Missing staff invitation email counter.'});
            }
            // A newly installed counter starts with a fresh allowance.
            if (setting.value === null) {
                return 0;
            }
            const counter = JSON.parse(setting.value);
            const validCount = Number.isSafeInteger(counter?.count) && counter.count >= 0;
            const validPeriodStart = counter?.periodStart === null ||
                (typeof counter?.periodStart === 'string' && Number.isFinite(Date.parse(counter.periodStart)));
            if (!validCount || !validPeriodStart) {
                throw new errors.IncorrectUsageError({message: 'Invalid staff invitation email counter.'});
            }
            if (counter.periodStart !== (periodStart ?? null)) {
                return 0;
            }
            return counter.count;
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
