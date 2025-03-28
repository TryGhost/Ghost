const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Backfilling the members.last_seen_at column from members_login_events.');
        await knex.raw(`
            UPDATE members
                INNER JOIN (SELECT member_id as id, MAX(created_at) as last_seen_at
                    FROM members_login_events
                    GROUP BY member_id) as logins ON logins.id = members.id
            SET
                members.last_seen_at = logins.last_seen_at
            WHERE
                members.last_seen_at IS NULL
                    OR members.last_seen_at < logins.last_seen_at
        `);
    },
    async function down(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Rolling back the backfilling of the members.last_seen_at column from members_login_events.');
        await knex('members').update({last_seen_at: null});
    }
);
