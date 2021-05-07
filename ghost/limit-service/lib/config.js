// NOTE: to support a new config in the limit service add an empty key-object pair in the export below.
// Each type of limit has it's own structure:
// 1. FlagLimit and AllowlistLimit types are empty objects paired with a key, e.g.: `customThemes: {}`
// 2. MaxLimit should contain a `currentCountQuery` function which would count the resources under limit
module.exports = {
    members: {
        currentCountQuery: async (db) => {
            let result = await db.knex('members').count('id', {as: 'count'}).first();
            return result.count;
        }
    },
    emails: {
        currentCountQuery: async (db, startDate) => {
            let result = await db.knex('emails')
                .sum('email_count', {as: 'count'})
                .where('created_at', '>=', startDate)
                .first();

            return result.count;
        }
    },
    staff: {
        currentCountQuery: async (db) => {
            let result = await db.knex('users')
                .select('users.id')
                .leftJoin('roles_users', 'users.id', 'roles_users.user_id')
                .leftJoin('roles', 'roles_users.role_id', 'roles.id')
                .whereNot('roles.name', 'Contributor').andWhereNot('users.status', 'inactive').union([
                    db.knex('invites')
                        .select('invites.id')
                        .leftJoin('roles', 'invites.role_id', 'roles.id')
                        .whereNot('roles.name', 'Contributor')
                ]);

            return result.length;
        }
    },
    customIntegrations: {
        currentCountQuery: async (db) => {
            let result = await db.knex('integrations')
                .count('id', {as: 'count'})
                .whereNotIn('type', ['internal', 'builtin'])
                .first();

            return result.count;
        }
    },
    customThemes: {}
};
