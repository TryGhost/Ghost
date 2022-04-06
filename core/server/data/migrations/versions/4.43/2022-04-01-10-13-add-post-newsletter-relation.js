const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');

const table = 'posts';
const column = 'newsletter_id';

/**
 * This migration is adding a new column `newsletter_id` to the table posts
 * that is a foreign key to `newsletters.id`.
 *
 * It isn't using the existing utils because of a performance issue. In MySQL,
 * adding a new row without `algorithm=copy` uses the INPLACE algorithm which
 * was too slow on big `posts` tables (~3 minutes for 10k posts). Switching to
 * the COPY algorithm fixed the issue (~3 seconds for 10k posts).
 */
module.exports = {
    config: {
        transaction: true
    },
    async up(config) {
        const knex = config.transacting;

        const hasColumn = await knex.schema.hasColumn(table, column);

        if (hasColumn) {
            logging.info(`Adding ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Adding ${table}.${column} column`);

        // Add the column

        let sql = knex.schema.table(table, function (t) {
            t.string(column, 24);
        }).toSQL()[0].sql;

        if (DatabaseInfo.isMySQL(knex)) {
            sql += ', algorithm=copy';
        }

        await knex.raw(sql);

        // Add the foreign key constraint

        await knex.schema.alterTable(table, function (t) {
            t.foreign(column).references('newsletters.id');
        });
    },
    async down(config) {
        const knex = config.transacting;

        const hasColumn = await knex.schema.hasColumn(table, column);

        if (!hasColumn) {
            logging.info(`Removing ${table}.${column} column - skipping as table is correct`);
            return;
        }

        logging.info(`Removing ${table}.${column} column`);

        // Drop the foreign key constraint

        await knex.schema.alterTable(table, function (t) {
            t.dropForeign(column);
        });

        // Drop the column

        let sql = knex.schema.table(table, function (t) {
            t.dropColumn(column);
        }).toSQL()[0].sql;

        if (DatabaseInfo.isMySQL(knex)) {
            sql += ', algorithm=copy';
        }

        await knex.raw(sql);
    }
};

