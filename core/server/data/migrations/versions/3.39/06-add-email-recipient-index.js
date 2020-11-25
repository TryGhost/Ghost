const logging = require('../../../../../shared/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        let hasIndex = false;

        if (knex.client.config.client === 'sqlite3') {
            const result = await knex.raw(`select * from sqlite_master where type = 'index' and tbl_name = 'email_recipients' and name = 'email_recipients_email_id_member_email_index'`);
            hasIndex = result.length !== 0;
        } else {
            const result = await knex.raw(`show index from email_recipients where Key_name = 'email_recipients_email_id_member_email_index'`);
            hasIndex = result[0].length !== 0;
        }

        if (hasIndex) {
            logging.info('Skipping creation of composite index on email_recipients for [email_id, member_email] - already exists');
            return;
        }

        logging.info('Creating composite index on email_recipients for [email_id, member_email]');
        await knex.schema.table('email_recipients', (table) => {
            table.index(['email_id', 'member_email']);
        });
    },

    async function down(knex) {
        let missingIndex = false;

        if (knex.client.config.client === 'sqlite3') {
            const result = await knex.raw(`select * from sqlite_master where type = 'index' and tbl_name = 'email_recipients' and name = 'email_recipients_email_id_member_email_index'`);
            missingIndex = result.length === 0;
        } else {
            const result = await knex.raw(`show index from email_recipients where Key_name = 'email_recipients_email_id_member_email_index'`);
            missingIndex = result[0].length === 0;
        }

        if (missingIndex) {
            logging.info('Skipping drop of composite index on email_recipients for [email_id, member_email] - does not exist');
            return;
        }

        logging.info('Dropping composite index on email_recipients for [email_id, member_email]');

        if (knex.client.config.client === 'mysql') {
            await knex.schema.table('email_recipients', (table) => {
                table.dropForeign('email_id');
                table.dropIndex(['email_id', 'member_email']);
                table.foreign('email_id').references('emails.id');
            });
        } else {
            await knex.schema.table('email_recipients', (table) => {
                table.dropIndex(['email_id', 'member_email']);
            });
        }
    }
);
