// NOTE: to support a new config in the limit service add an empty key-object pair in the export below.
// Each type of limit has it's own structure:
// 1. FlagLimit and AllowlistLimit types are empty objects paired with a key, e.g.: `customThemes: {}`
// 2. MaxLimit should contain a `currentCountQuery` function which would count the resources under limit
module.exports = {
    members: {
        currentCountQuery: async (knex) => {
            let result = await knex('members').count('id', {as: 'count'}).first();
            return result.count;
        }
    },
    newsletters: {
        currentCountQuery: async (knex) => {
            let result = await knex('newsletters')
                .count('id', {as: 'count'})
                .where('status', '=', 'active')
                .first();

            return result.count;
        }
    },
    emails: {
        currentCountQuery: async (knex, startDate) => {
            let result = await knex('emails')
                .sum('email_count', {as: 'count'})
                .where('created_at', '>=', startDate)
                .first();

            return result.count;
        }
    },
    staff: {
        currentCountQuery: async (knex) => {
            let result = await knex('users')
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
    customIntegrations: {
        currentCountQuery: async (knex) => {
            let result = await knex('integrations')
                .count('id', {as: 'count'})
                .whereNotIn('type', ['internal', 'builtin'])
                .first();

            return result.count;
        }
    },
    customThemes: {},
    uploads: {
        // NOTE: this function should not ever be used as for uploads we compare the size
        //       of the uploaded file with the configured limit. Noop is here to keep the
        //       MaxLimit constructor happy
        currentCountQuery: () => {},
        // NOTE: the uploads limit is based on file sizes provided in Bytes
        //       a custom formatter is here for more user-friendly formatting when forming an error
        formatter: count => `${count / 1000000}MB`
    }
};
