const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const {createNonTransactionalMigration} = require('../../utils');

const INDEX_NAME = 'members_created_at_id_index';

async function hasIndex(knex) {
    if (DatabaseInfo.isSQLite(knex)) {
        const result = await knex.raw(`select * from sqlite_master where type = 'index' and tbl_name = 'members' and name = '${INDEX_NAME}'`);
        return result.length !== 0;
    }

    const result = await knex.raw(`show index from members where Key_name = '${INDEX_NAME}'`);
    return result[0].length !== 0;
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (await hasIndex(knex)) {
            logging.info(`Skipping creation of index ${INDEX_NAME} on members for created_at, id - already exists`);
            return;
        }

        logging.info(`Creating index ${INDEX_NAME} on members for created_at, id`);

        if (DatabaseInfo.isMySQL(knex)) {
            await knex.raw(`
                ALTER TABLE members
                ADD INDEX ${INDEX_NAME} (created_at, id),
                ALGORITHM=INPLACE,
                LOCK=NONE
            `);
            return;
        }

        await knex.schema.table('members', (table) => {
            table.index(['created_at', 'id']);
        });
    },

    async function down(knex) {
        if (!(await hasIndex(knex))) {
            logging.info(`Skipping drop of index ${INDEX_NAME} on members for created_at, id - does not exist`);
            return;
        }

        logging.info(`Dropping index ${INDEX_NAME} on members for created_at, id`);

        if (DatabaseInfo.isMySQL(knex)) {
            await knex.raw(`
                ALTER TABLE members
                DROP INDEX ${INDEX_NAME},
                ALGORITHM=INPLACE,
                LOCK=NONE
            `);
            return;
        }

        await knex.schema.table('members', (table) => {
            table.dropIndex(['created_at', 'id']);
        });
    }
);
